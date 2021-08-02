import logging
import os

from telegram.ext import CommandHandler, Filters, MessageHandler, Updater
from dotenv import load_dotenv

from Commands import GenerateQuoteCommand
from Commands import DispBoatAllocCommand
from Commands import HelpCommand


"""uncomment this line if testing locally"""
#load_dotenv() 

PORT = int(os.environ.get('PORT', '8443'))
TOKEN = str(os.environ.get("BOT_TOKEN"))

# Enable logging
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',level=logging.INFO)
logger = logging.getLogger(__name__)


# Define a few command handlers. These usually take the two arguments update and
# context. Error handlers also receive the raised TelegramError object in error.
def start(update, context):
    """Send a message when the command /start is issued."""
    update.message.reply_text('Hi!')

def echo(update, context):
    """Echo the user message."""
    update.message.reply_text(update.message.text)

def error(update, context):
    """Log Errors caused by Updates."""
    logger.warning('Update "%s" caused error "%s"', update, context.error)

def main():

    """Start the bot."""
    # Create the Updater and pass it your bot's token.
    updater = Updater(TOKEN)

    # Get the dispatcher to register handlers
    dp = updater.dispatcher

    # on different commands - answer in Telegram
    dp.add_handler(CommandHandler("start", start))
    dp.add_handler(CommandHandler("help", HelpCommand.execute))
    dp.add_handler(CommandHandler("getQuote", GenerateQuoteCommand.execute))
    dp.add_handler(CommandHandler("getBoatAllocation", DispBoatAllocCommand.execute))
    # on noncommand i.e message - echo the message on Telegram
    dp.add_handler(MessageHandler(Filters.text, echo))

    # log all errors
    dp.add_error_handler(error)

    # Start the Bot
    updater.start_webhook(listen="0.0.0.0",
                          port=PORT,
                          url_path=TOKEN,
                          webhook_url='https://nuscanoeingbot.herokuapp.com/' + TOKEN)
    
    updater.idle()

# Start the app
if __name__ == '__main__':
    main()
