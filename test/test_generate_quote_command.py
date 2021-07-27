import sys

sys.path.append("./src/")

from Commands import GenerateQuoteCommand

def test_Generate_quotecommand():
  assert type(GenerateQuoteCommand.getQuote())==str