// Please read the README for full instructions on usage :)

function main() {
  // Check if the spreadsheet exists
  var sheetName = "Workday Job Tracker";
  var spreadsheet = getOrCreateSpreadsheet(sheetName);

  // Get the most recent job title and corresponding date applied from the spreadsheet
  var lastJobTitle = getLastJobTitle(spreadsheet);
  var lastJobDate = getLastJobDate(spreadsheet);
  
  // Scrape emails starting from the last date applied
  scrapeEmails(lastJobDate, lastJobTitle, spreadsheet);
}

function getOrCreateSpreadsheet(sheetName) {
  var files = DriveApp.getFilesByName(sheetName);
  var spreadsheet;

  if (files.hasNext()) {
    spreadsheet = SpreadsheetApp.open(files.next());
    Logger.log(sheetName + " already exists.");
  } else {
    spreadsheet = SpreadsheetApp.create(sheetName);
    Logger.log("Created new spreadsheet: " + spreadsheet.getUrl());

    // Set headers
    var sheet = spreadsheet.getActiveSheet();
    sheet.getRange("A1").setValue("Job Title");
    sheet.getRange("B1").setValue("Company");
    sheet.getRange("C1").setValue("Location");
    sheet.getRange("D1").setValue("Date");
    sheet.getRange("E1").setValue("Status");

    // Set text wrapping for columns A-E
    sheet.getRange("A:E").setWrap(true);
  }
  return spreadsheet;
}

function getLastJobTitle(spreadsheet) {
  var sheet = spreadsheet.getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    // No jobs listed, return an empty string 
    return "";
  } else {
    // Get the job title from the last row
    return sheet.getRange(lastRow, 1).getValue();
  }
}

function getLastJobDate(spreadsheet) {
  var sheet = spreadsheet.getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    // No jobs listed, return a very old date
    return new Date(0); 
  } else {
    // Get the date from the last row
    return new Date(sheet.getRange(lastRow, 4).getValue()); 
  }
}

function scrapeEmails(lastJobDate, lastJobTitle, spreadsheet) {
  // Format the date to RFC 3339 format (used by Gmail search)
  var formattedDate = lastJobDate.toISOString().slice(0, 10);
  // Search for emails from any sender at myworkday.com with the specified keywords
  // Change the search query (the part in the parentheses) to match your purposes. Remove that part completely if you'd like to just search all emails from Workday
  var query = `from:@myworkday.com (ENTER KEYWORDS HERE) after:${formattedDate}`;
  var threads = GmailApp.search(query);
  
  if (threads.length > 0) {
    var sheet = spreadsheet.getActiveSheet();
    var foundLastJobTitle = lastJobTitle === "";

    for (var i = threads.length - 1; i >= 0; i--) { // Start from the oldest thread
      var messages = threads[i].getMessages();
      for (var j = messages.length - 1; j >= 0; j--) { // Start from the oldest message in the thread
        var message = messages[j];
        
        // Extract details from the email
        var date = message.getDate();
        var subject = message.getSubject();
        var body = message.getBody(); // This extracts the HTML body

        if (subject.toLowerCase().includes("thank") || subject.toLowerCase().includes("confirmation")) {
          var jobDetails = queryGeminiAPI(body, date);

          if (!jobDetails) { // Skip this email if jobDetails is null
            continue;
          }
          
          // Check if the job title matches the last known job title
          if (!foundLastJobTitle) {
            if (jobDetails.title === lastJobTitle) {
              foundLastJobTitle = true;
            }
            continue;
          }
          
          // Only add if the type is "confirmation"
          if (jobDetails.type === "confirmation") {
            sheet.appendRow([jobDetails.title, jobDetails.company, jobDetails.location, jobDetails.date, "Applied"]);
          }
          if (jobDetails.type === "update") {
            // Get the range of column A
            var range = sheet.getRange("A:A");
            // Get all the values in column A
            var values = range.getValues();

            // Loop through the values
            var found = false;
            for (var k = 0; k < values.length; k++) {
              // Check if the current value matches the value being searched for
              if (values[k][0] === jobDetails.title) {
                // Set the update in the update column
                sheet.getRange(k + 1, 5).setValue(jobDetails.update); 
                found = true;
                break;
              }
            }
          }
        }
      }
    }
  } else {
    Logger.log('No emails found from @myworkday.com with the specified keywords');
  }
}

function queryGeminiAPI(body, date) {
  // Replace with your actual Gemini API key. You can get one for free at https://aistudio.google.com/app/apikey
  var apiKey = 'ADD API KEY HERE'; 
  var endpoint = 'https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText?key=' + apiKey;
  var query = `Identify from this email if it is a confirmation of application or application status update. If it is a confirmation of application, return the job title, company, and location of the job. If you cannot identify the location, return that as "unavailable". You MUST provide your response in the following JSON format for confirmation of application emails:
  {
    "job_info": [
      {
        "type": "<confirmation>",
        "jobTitle": "<job title>",
        "company": "<company>",
        "location": "<location/remote/unavailable>"
      }
    ]
  }
  If it is an application status update email, return the job title, company, and what the update is. You MUST provide your response in the following JSON format for application status update emails:
  {
    "job_info": [
      {
        "type": "<update>",
        "jobTitle": "<job title>",
        "company": "<company>",
        "update": "<provide the update here>"
      }
    ]
  }
  DO NOT INCLUDE ANY SYNTAX HIGHLIGHTING OR CODE BLOCK FORMATTING. Do NOT include a \`\`\`json\`\`\` statement in your response. Here is the email: ` + body;

  var payload = JSON.stringify({
    "prompt": {
      "text": query
    },
    "temperature": 0.2
  });

  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': payload,
    'muteHttpExceptions': true
  };

  try {
    var response = UrlFetchApp.fetch(endpoint, options);
    var jsonResponse = JSON.parse(response.getContentText());
    
    // Process the response as needed
    if (jsonResponse && jsonResponse.candidates && jsonResponse.candidates.length > 0) {
      var generatedContent = jsonResponse.candidates[0].output;
      generatedContent = generatedContent.replace(/```json/g, '').replace(/```/g, '');
      generatedContent = generatedContent.replace(/,\s*([\]}])/g, '$1');
      // Assuming the generated content is a JSON string, parse it
      var generatedJson = JSON.parse(generatedContent);
      
      if (generatedJson.job_info && generatedJson.job_info.length > 0 && generatedJson.job_info[0].type==="confirmation") {
        return {
          type: generatedJson.job_info[0].type,
          title: generatedJson.job_info[0].jobTitle,
          company: generatedJson.job_info[0].company,
          location: generatedJson.job_info[0].location,
          date: formatDate(date)
        };
      } else if (generatedJson.job_info && generatedJson.job_info.length > 0 && generatedJson.job_info[0].type==="update") {
        return {
          type: generatedJson.job_info[0].type,
          title: generatedJson.job_info[0].jobTitle,
          company: generatedJson.job_info[0].company,
          update: generatedJson.job_info[0].update,
          date: formatDate(date)
        };
      } else {
        Logger.log('No job info found in the generated content');
        return null;
      }

    } else {
      Logger.log('No generated content found in the response');
      return null;
    }
    
  } catch (e) {
    Logger.log('Error fetching data from Gemini API: ' + e.toString());
    return null;
  }
}

function formatDate(date) {
  var day = date.getDate();
  var month = date.getMonth() + 1; // Months are zero-based
  var year = date.getFullYear();
  return `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
}
