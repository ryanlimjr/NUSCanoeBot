import json
import os

import gspread
import pandas as pd
from dotenv import load_dotenv
from oauth2client.service_account import ServiceAccountCredentials

"""uncomment this when testing locally"""
load_dotenv()
GOOGLE_CREDS=json.loads(os.environ.get("GOOGLE_CREDS"))

# use creds to create a client to interact with the Google Drive API
scope = ['https://spreadsheets.google.com/feeds','https://www.googleapis.com/auth/drive']
creds = ServiceAccountCredentials.from_json_keyfile_dict(GOOGLE_CREDS, scope)
client = gspread.authorize(creds)

# Find a workbook by name and open the first sheet
# Make sure you use the right name here.
class DispBoatAllocCommand:

    @staticmethod
    def test():
        sheet = client.open("telegram bot testing")
        # Extract and print all of the values
        worksheet = sheet.get_worksheet(1)
        

DispBoatAllocCommand.test()