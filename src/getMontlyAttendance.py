import os
import json
from dotenv import load_dotenv
from pkg_resources import FileMetadata
from telegram import Update,ParseMode
from telegram.ext import CallbackContext
from googleapiclient.discovery import build
from google.oauth2 import service_account
from df2gspread import df2gspread as d2g
import pandas as pd

import utils
from constants import DATE_CELL_RANGE_ATTENDANCE_MORN, DATE_CELL_RANGE_ATTENDANCE_NOON

"""uncomment this when testing locally"""
#load_dotenv()

SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
SERVICE_ACCOUNT_CREDS = json.loads(str(os.environ.get("GOOGLE_CREDENTIALS")))
SPREAD_SHEET_ID = str(os.environ.get("SHEET_ID"))
FOLDER_ID = str(os.environ.get("FOLDER_ID"))
CREDS = service_account.Credentials.from_service_account_info( SERVICE_ACCOUNT_CREDS scopes=SCOPES)
SERVICE_SHEETS = build('sheets', 'v4', credentials=CREDS)
DRIVE = build('drive', 'v3', credentials=CREDS)
SHEET = SERVICE_SHEETS.spreadsheets()

class GetMonthlyAttendanceCommand:
    attendance = {}

    @staticmethod
    def getWorksheetName(week:str, isMorn:bool) -> str:
        """Gets the worksheetname and cell range for the attendance 

        Args:
            week (str): the week in string format 
            isMorn (bool): is morning or noon

        Returns:
            str: sheetname and range
        """
        worksheetName = week + "!" + (DATE_CELL_RANGE_ATTENDANCE_MORN if isMorn else DATE_CELL_RANGE_ATTENDANCE_NOON)
        return worksheetName

    @staticmethod
    def getNicknameTable() -> dict:
        worksheet = SHEET.values().get(spreadsheetId=SPREAD_SHEET_ID,
            range = "Nicknames!A:B",
            majorDimension = "COLUMNS").execute()
        dataRaw = worksheet.get('values', [])
        nicknameToNameMap = {dataRaw[0][i].strip(): dataRaw[1][i].strip() for i in range(1,len(dataRaw[0]))}
        return nicknameToNameMap

    @staticmethod
    def getWeeklyAttendance(week:str) -> dict:
        weeklyAttendance = {}
        isMorn = True
        data = SHEET.values().get(spreadsheetId=SPREAD_SHEET_ID,
            range = GetMonthlyAttendanceCommand.getWorksheetName(week, isMorn),
            majorDimension = "COLUMNS").execute().get('values', [])
        dataNoon = SHEET.values().get(spreadsheetId=SPREAD_SHEET_ID,
            range = GetMonthlyAttendanceCommand.getWorksheetName(week, not isMorn),
            majorDimension = "COLUMNS").execute().get('values', [])
        for i in range(len(dataNoon)):
            data[i] = data[i] + dataNoon[i]
        data = list(filter(lambda x: 'Name' in x, data))
        for i in range(len(data)):
            data[i] = list(filter(lambda x: x != 'Name' and len(x) > 0, data[i] ))
            weeklyAttendance[data[i][0]] = data[i][1:] if len(data[i]) > 1 else []
        return weeklyAttendance

    @staticmethod
    def filterRawMontlyAttendance(rawMonthlyAttendance:dict) ->dict:
        filtered = dict()
        datesInMonth = utils.getAllDatesInPrevMonth()
        for (key, value) in rawMonthlyAttendance.items():
            # Check if key is even then add pair to new dictionary
            if key in datesInMonth:
                filtered[key] = value
        return filtered

    
    @staticmethod
    def getMonthlyAttendance() -> dict:
        weeksInPrevMonth = utils.getAllWeeksInPrevMonth()
        rawMonthlyAttendance = {}
        for week in weeksInPrevMonth:
            rawMonthlyAttendance.update(GetMonthlyAttendanceCommand.getWeeklyAttendance(week))
        monthlyAttendance = GetMonthlyAttendanceCommand.filterRawMontlyAttendance(rawMonthlyAttendance)
        return monthlyAttendance

    @staticmethod
    def getFormattedMonthlyAttendance() ->list:
        monthlyAttendance = GetMonthlyAttendanceCommand.getMonthlyAttendance()
        nicknameTable = GetMonthlyAttendanceCommand.getNicknameTable()
        formalMontlyAttendance = pd.DataFrame.from_dict(nicknameTable,orient='index')
        for date in monthlyAttendance.keys():
            formalMontlyAttendance[date] = 0
            for nickname in monthlyAttendance[date]:
                if nickname.strip() in formalMontlyAttendance.index:
                    formalMontlyAttendance.loc[nickname.strip(),date]=1
        return formalMontlyAttendance.T.reset_index().values.T.tolist()
    
    @staticmethod
    def createAttendanceFile():
        data = GetMonthlyAttendanceCommand.getFormattedMonthlyAttendance()
        body = { 'values': data }
        filename = utils.getPrevMonthStr() + ' Training Attendance'
        FileMetadata = {'name':[filename], 
                                    'parents':[FOLDER_ID],
                                    'mimeType': 'application/vnd.google-apps.spreadsheet',}
        file = DRIVE.files().create(body=FileMetadata,).execute()
        fileId = file['id']
        SHEET.values().update(spreadsheetId=fileId, range="Sheet1", valueInputOption="USER_ENTERED", body=body).execute()

    @staticmethod
    def execute(update: Update, context: CallbackContext ) -> None:
        """
        Sends response back to telegram user
        """
        GetMonthlyAttendanceCommand.createAttendanceFile()
        update.message.reply_text(f'Attendance for {utils.getPrevMonthStr()} is created on the Google drive!')



