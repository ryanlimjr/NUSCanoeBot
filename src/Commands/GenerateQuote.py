import requests as req

class GenerateQuoteCommand:
    ERROR = 'There is problems generating a quote please try again later'

    @staticmethod
    def parseResponse(response):
        quote = response.json()[0]
        return quote['q'] + "\n\n - " + quote['a']

    @staticmethod
    def getQuote():
        response = req.get('https://zenquotes.io/api/random') 
        statusCode = response.status_code
        return GenerateQuoteCommand.parseResponse(response) if statusCode == 200 else GenerateQuoteCommand.ERROR

    @staticmethod
    def execute(update, context):
        update.message.reply_text(GenerateQuoteCommand.getQuote())
