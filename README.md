# workday-job-tracker

## Purpose
This is a Google Apps script created with the purpose of providing a quick and easy way to keep track of jobs you've applied to using Workday. This script goes through all emails you've received from Workday and stores each job applied to in a Google Spreadsheet. The spreadsheet stores the job title, company, location, date applied, and status of each job you've applied to. I'm currently working on implementing a version of this script that also tracks jobs applied to on Indeed. When those are finished, I'll work on combining them into one main script that I'll also publish on Github.

## How To Use:
- Open Google Apps Script and create a new project
- Copy and paste the "main.js" file.
- Change the search query (the part in the parentheses) as needed (line 70). If you would like to just search all emails from Workday, remove the parentheses part completely.
- Visit https://aistudio.google.com/app/apikey and generate an API key. Copy and paste this key into the API field (line 134)
- Save your script and give it a name, and then run the script! You will have to authorize some stuff though. In the pop-up, click "Advanced", and then click "Go to (script title)". The link to the spreadsheet created will appear in the console logger. Copy and paste this link in a new tab to see the results!
- Run the script whenever you want to update your spreadsheet. All you have to do is just open the same script again and click the run button. The script will take care of the rest.
- If you have any issues, please report them using the issues tab. Alternatively, you can reach me at nasreenmir06@gmail.com. 

## Future Add-Ons:
- Finish the Indeed version of this tracker.
- Combine Workday and Indeed tracker into one script.
- Make the script work with jobs applied to on SAP Success Factors and LinkedIn.
- Make the script work with all emails from any sender.
- Automated follow-up emails?
