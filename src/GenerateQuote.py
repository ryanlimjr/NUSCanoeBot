from json.decoder import JSONDecodeError
import requests as req
from requests import Response
from requests.exceptions import RequestException
from telegram import Update
from telegram.ext import CallbackContext

from constants import ERROR_GEN_QUOTE, ERROR_PARSE_RESPONSE


class GenerateQuoteCommand:
    @staticmethod
    def parseResponse(response: Response) -> str:
        """
        Parses the response from the quotes API and reformats it.

        Args:
            response (Response): response object from doing a get request to the quotes api.

        Returns:
            String: the reformated quote.
        """
        try:
            quote = response.json()[0]
            return quote["q"] + "\n\n - " + quote["a"]
        except JSONDecodeError:
            return ERROR_PARSE_RESPONSE

    @staticmethod
    def getQuote() -> str:
        """
        Does a get request to the quote API and extracts the quote

        Returns:
            String: quote that was requested from the quotes API
        """
        try:
            response = req.get("https://zenquotes.io/api/random")
            statusCode = response.status_code
            return (
                GenerateQuoteCommand.parseResponse(response)
                if statusCode == 200
                else ERROR_GEN_QUOTE
            )
        except RequestException:
            return ERROR_GEN_QUOTE

    @staticmethod
    def execute(update: Update, context: CallbackContext) -> None:
        """
        Sends response back to telegram user
        """
        update.message.reply_text(GenerateQuoteCommand.getQuote())
