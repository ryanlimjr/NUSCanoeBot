import logging
import os
from telegram.ext import CommandHandler, Updater
from dotenv import load_dotenv

from GenerateQuote import GenerateQuoteCommand
from Help import HelpCommand
from DispBoatAlloc import DispBoatAllocCommand
from getMontlyAttendance import GetMonthlyAttendanceCommand

#load_dotenv()
PORT = int(os.environ.get('PORT', '8443'))
TOKEN = str(os.environ.get("BOT_TOKEN"))

####################################
#                           Logger setup                          #
####################################
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',level=logging.INFO)
logger = logging.getLogger(__name__)
def error(update, context):
    logger.warning('Update "%s" caused error "%s"', update, context.error)

def main():

    ####################################
    #                          Bot Initialization                     #
    ####################################
    updater = Updater(TOKEN)
    dispatcher = updater.dispatcher

    dispatcher.add_handler(CommandHandler("help", HelpCommand.execute))
    dispatcher.add_handler(CommandHandler("getQuote", GenerateQuoteCommand.execute))
    dispatcher.add_handler(CommandHandler("getBoatAllocation", DispBoatAllocCommand.execute))
    dispatcher.add_handler(CommandHandler("getAttendance", GetMonthlyAttendanceCommand.execute))
    ####################################
    #                      Logger initialization                    #
    ####################################
    dispatcher.add_error_handler(error)

    ####################################
    #                               Run bot                              #
    ####################################
    # Local testing #
    #updater.start_polling()
    # production #
    updater.
    updater.start_webhook(listen="0.0.0.0",
                          port=PORT,
                          url_path=TOKEN,
                          webhook_url='https://nuscanoebot-production.up.railway.app/' + TOKEN)

    updater.idle()

# Start the app
if __name__ == '__main__':
    main()
