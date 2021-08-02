import json
import os
import requests
from datetime import date, datetime, timedelta
from typing import List, Tuple

import gspread
import pandas as pd
from constants import DATE_CELL_RANGE
from dotenv import load_dotenv
from gspread import client
from gspread.models import Cell
from oauth2client.service_account import ServiceAccountCredentials
from telegram import Update
from telegram.ext import CallbackContext

"""uncomment this when testing locally"""
# load_dotenv()
# use creds to create a client to interact with the Google Drive API

HCTI_API_ENDPOINT = "https://hcti.io/v1/image"
HCTI_API_USER_ID = str(os.environ.get("HCTI_USER_ID"))
HCTI_API_KEY = str(os.environ.get("HCTI_API_KEY"))
GOOGLE_CREDS=json.loads(os.environ.get("GOOGLE_CREDS"))
SHEET_NAME=str(os.environ.get("SHEET_NAME"))
scope = ['https://spreadsheets.google.com/feeds','https://www.googleapis.com/auth/drive']
creds = ServiceAccountCredentials.from_json_keyfile_dict(GOOGLE_CREDS, scope)
client = gspread.authorize(creds)
sheet = client.open('telegram bot testing')
class DispBoatAllocCommand:

    @staticmethod
    def getWorksheetName(today: date) -> str:
        """The typical format of the worksheet name for boat allocation of the week is "mmm d1d1/m1m1 - d2d2/m2m2"
        where d1 and m1 is the date of the start of the current week and d2 and m2 is the end of the current week 
        this function generates the worksheet name from the current date, so that we can retrieve the data for 
        today's boat 

        Returns:
            str: the worksheet name where today's boat allocation is located
        """
        month = today.strftime("%b")
        startOfWeek = today - timedelta(days=today.weekday())
        endOfWeek = startOfWeek + timedelta(days=6)
        worksheetName = "{0} {1} - {2}".format(month, startOfWeek.strftime("%d/%m"), endOfWeek.strftime("%d/%m"))
        return worksheetName

    @staticmethod
    def columnString(n):
        string = ""
        while n > 0:
            n, remainder = divmod(n - 1, 26)
            string = chr(65 + remainder) + string
        return string


    @staticmethod
    def getTargetRangeFromDates(listOfCells: List[Cell], today: str) -> str:
        """finds the range of cells that is relevant to today's boat allocation

        Args:
            listOfCells (List[Cell]): This week range of dates 
            today (str): today's date

        Returns:
            str: the range of cells that is relevant to today's boat allocation in A1 notationf
        """
        for i in range(len(listOfCells)):
            if listOfCells[i].value == today:
                start = '{}15'.format(DispBoatAllocCommand.columnString(listOfCells[i].col))
                end = '{}52'.format(DispBoatAllocCommand.columnString(listOfCells[i+2].col))
                return '{0}:{1}'.format(start, end)

    @staticmethod
    def parseBoatRawAllocationIntoHTML(rawBoatAllocation: List[List[str]]) -> str:
        boatAllocationFiltered = list(filter(lambda x : x, rawBoatAllocation))
        boatAllocationNoRemarks = list(map(lambda x : [x[0],x[2]], boatAllocationFiltered))
        dataframe = pd.DataFrame(boatAllocationNoRemarks[1:], columns=boatAllocationNoRemarks[0])
        html = dataframe.to_html(index=False, justify='left')
        return html

    @staticmethod
    def parseHTMLIntoImage(html: str) -> str:
        data = {'html': html}
        image = requests.post(url = HCTI_API_ENDPOINT, data = data, auth=(HCTI_API_USER_ID, HCTI_API_KEY))
        return image.json()['url']

    @staticmethod
    def parseBoatAllocation(rawBoatAllocation: List[List[str]]) -> str:
        html = DispBoatAllocCommand.parseBoatRawAllocationIntoHTML(rawBoatAllocation)
        image = DispBoatAllocCommand.parseHTMLIntoImage(html)
        return image

    @staticmethod
    def getBoatAllocation(today: date) -> str:
        worksheet = sheet.worksheet(DispBoatAllocCommand.getWorksheetName(today))
        listOfdates = worksheet.range(DATE_CELL_RANGE)
        targetRange = DispBoatAllocCommand.getTargetRangeFromDates(listOfdates, today.strftime('%d/%m/%Y'))
        rawBoatAllocation = worksheet.get(targetRange)
        return DispBoatAllocCommand.parseBoatAllocation(rawBoatAllocation)
    
    @staticmethod
    def execute(update: Update, context: CallbackContext) -> None:
        """
        Sends response back to telegram user
        """
        update.message.reply_photo(DispBoatAllocCommand.getBoatAllocation(date.today()))

