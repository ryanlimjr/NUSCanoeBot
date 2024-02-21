## How to setup Google-side everything

Requirements: a Google account.

Main tasks:

1. [Create a Google Cloud Project](#google-cloud-project-setup) to let
   us control Google's services programmatically.
2. [Create a spreadsheet](#connect-a-spreadsheet) and link it to the
   project.

### Google Cloud Project Setup

1. Create a Google Cloud Project.

2. Enable the Google Sheets API for that project.

   1. As of time of writing, there is a convenient search bar at the
      top of the browser page for Google Cloud Console. Search for
      "Google Sheets API" and the first result should be right.

3. Create credentials for a service account.

   1. Go to the Credentials page. As of time of writing, it resides in
      **APIs & Services > Credentials**. For future proofing: here are
      some keywords to search for: `API`, `API & Services`,
      `Credentials`, `API Keys`, `Service Accounts`.
   2. Create new credentials for a service account. Follow
      instructions and it's okay to skip anything that is optional.
   3. After successfully creating a service account, it should show up
      on the Credentials page. Dive into it and look around for
      creating a **key**. Choose the JSON format because it's easier
      to read.

4. Load the credentials into this repository's environment.
   1. Copy the public `.env.example` file and rename it to `.env`.
      Note that `.env` is git-ignored so it's safe to put private keys
      in here.
   2. Use the information in the downloaded JSON file from Step 3 to
      fill in the blanks in the `.env` file. Specifically, it requires
      a **private key** and a **client email**.

### Connect a spreadsheet

1.  Create a fresh spreadsheet. Quickest way to type `sheets.new` into
    your web browser's url bar.

2.  Share this spreadsheet with the service account. Give it `Editor`
    permissions.

3.  Obtain the spreadsheet id by from the URL.
