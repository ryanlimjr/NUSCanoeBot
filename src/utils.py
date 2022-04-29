from datetime import date, timedelta
import calendar

def getDayInt(day: date) -> int:
    """Converts day in date type to integer representation of the day of the week

    Args:
        day (date): day in date type

    Returns:
        int: integer representation of the day of the week
    """
    return day.weekday()


def getTodayInt() -> int:
    """Converts today in date type to integer representation of the day of the week

    Returns:
        int: integer representation of today of the week
    """
    today = date.today()
    return getDayInt(today)

def getWeek(day:date ) -> str:
    """Gets the week in MMM DD/MM - MMM DD/MM format based on the day input

    Args:
        day (date): day in date type

    Returns:
        str: the week in MMM DD/MM - MMM DD/MM format
    """
    startOfWeek = day - timedelta(days=getDayInt(day))
    endOfWeek = startOfWeek + timedelta(days=6)
    Week = startOfWeek.strftime('%b %-d/%-m') + " - " + endOfWeek.strftime('%b %-d/%-m')
    return Week

def getCurrentWeek() -> str:
    """Gets the current week in MMM DD/MM - MMM DD/MM format

    Returns:
        str: the current week in MMM DD/MM - MMM DD/MM format
    """
    today = date.today()
    return getWeek(today)

def getAllWeeksInPrevMonth() -> list:
    """Gets a list of all the weeks in the month

    Returns:
        list: list of weeks in the month
    """
    weeks = []
    today= date.today()
    first = today.replace(day=1)
    lastMonth = first - timedelta(days=1)
    lastMonthInt = lastMonth.month
    for i in range(1,32):
        try :
            day = today.replace(month=lastMonthInt, day=i)
        except ValueError:
            break
        week = getWeek(day)
        if week not in weeks:
            weeks.append(week)
    return weeks

def getAllDatesInPrevMonth() -> list:
    """Gets a list of all the weeks in the month

    Returns:
        list: list of weeks in the month
    """
    today= date.today()
    first = today.replace(day=1)
    lastMonth = first - timedelta(days=1)
    lastMonthInt = lastMonth.month
    year = today.year if lastMonthInt != 12 else (today.year - 1)
    numDays = calendar.monthrange(year, lastMonthInt)[1]
    days = [date(year, lastMonthInt, day).strftime("%-d/%-m/%Y") for day in range(1, numDays+1)]
    return days

def getPrevMonthStr() -> str:
    today= date.today()
    first = today.replace(day=1)
    lastMonth = first - timedelta(days=1)
    return lastMonth.strftime('%B')

