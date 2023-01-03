from constants import HELP_MESSAGE


class HelpCommand:
    @staticmethod
    def execute(update, context) -> None:
        update.message.reply_text(HELP_MESSAGE)
