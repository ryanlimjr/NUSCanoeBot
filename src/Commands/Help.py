from constants import HELP_MESSAGE
class HelpCommand:

    @staticmethod
    def generateHelpMessage():
        return 'help'

    @staticmethod
    def execute(update , context):
        update.message.reply_text(HelpCommand.generateHelpMessage())