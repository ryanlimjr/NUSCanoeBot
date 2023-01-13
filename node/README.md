# NUS Canoe

## Development Setup

### Requirements

- node.js (v16)
- yarn (v1)
- google credentials (Get this from a current developer, or go to
  Google Cloud Console and generate a new set)

### Getting started

1. Navigate to the same directory as this README.
2. Run `yarn` to install all dependencies.
3. That's it.

## Roadmap

### Development

- [x] Instructions for generating fresh Google credentials.
- [ ] Setup a fresh user-facing attendance spreadsheet from scratch.
- [ ] Set up user-specific permissions for the telegram bot

### User-facing

- [ ] Automate weekly generation of attendance sheets. Upon the
      trigger time (saturday evening/etc), send a telegram DM to all the
      exco and prompt them to update the template if necessary. Once
      anyone has updated, they will reply with a keyword and the bot will
      go ahead and create the next week's attendance sheet.
- [ ] Automate monthly collection of attendance. Upon the trigger time
      (end-of-month midnight, etc), generate a master list for that month
      and prompt the exco to check it.
- [ ] Automate pre-training boat allocation flush. 2h before training
      starts, send the boat allocation to the team chat.
