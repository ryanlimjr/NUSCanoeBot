import os
from dotenv import load_dotenv
from telegram import Update,ParseMode
from telegram.ext import CallbackContext
from googleapiclient.discovery import build
from google.oauth2 import service_account
from tabulate import tabulate

import utils
from constants import DATE_CELL_RANGE

"""uncomment this when testing locally"""
#load_dotenv()

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SERVICE_ACCOUNT_FILE = str(os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"))
SPREAD_SHEET_ID = str(os.environ.get("SHEET_ID"))
CREDS = service_account.Credentials.from_service_account_file( SERVICE_ACCOUNT_FILE, scopes=SCOPES)
SERVICE = build('sheets', 'v4', credentials=CREDS)
SHEET = SERVICE.spreadsheets()


class DispBoatAllocCommand:

    @staticmethod
    def getWorksheetName() -> str:
        """
        The format of the worksheet name for boat allocation of the week is "MMM DD/MM - MMM DD/MM"

        Returns:
            str: the worksheet name where today's boat allocation is located
        """
        currentWeek = utils.getCurrentWeek()
        worksheetName = currentWeek + "!" + DATE_CELL_RANGE
        return worksheetName

    @staticmethod
    def getWorksheetData() -> list:
        """
        Retrieves the raw data from the sheets

        Returns:
            list: list of boat allocations column wise
        """
        worksheet = SHEET.values().get(spreadsheetId=SPREAD_SHEET_ID,
            range = DispBoatAllocCommand.getWorksheetName(),
            majorDimension = "COLUMNS").execute()
        rawWorksheetData = worksheet.get('values', [])
        nameColumn = utils.getTodayInt()*3
        boatColumn = nameColumn+2
        return list(zip(rawWorksheetData[nameColumn], rawWorksheetData[boatColumn]))

    @staticmethod
    def parseData(rawData: list) -> str:
        """parses the list into string in table format

        Args:
            rawData (list): boat allocation in list format

        Returns:
            str: boat allocation in str format in table formatting 
        """
        filteredData = filter(lambda x: len(x[0]) != 0 and len(x[1]) != 0, rawData)
        table = tabulate(list(filteredData), headers=["Name", "Boat"])
        return table

    @staticmethod
    def getBoatAllocation() -> str:
        """wrapper function that encapsulates the above declared function

        Returns:
            str: the boat allocation in string format in table formatting
        """
        rawData = DispBoatAllocCommand.getWorksheetData()
        boatAllocation = DispBoatAllocCommand.parseData(rawData)
        return boatAllocation

    @staticmethod
    def execute(update: Update, context: CallbackContext ) -> None:
        """
        Sends response back to telegram user
        """
        table = DispBoatAllocCommand.getBoatAllocation()
        update.message.reply_text(f'<pre>{table}</pre>', parse_mode=ParseMode.HTML)
