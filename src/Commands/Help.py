class HelpCommand:

    @staticmethod
    def generateHelpMessage():
        return 'help'

    @staticmethod
    def execute(update , context):
        return HelpCommand.generateHelpMessage()
        # update.message.reply_text(HelpCommand.execute())