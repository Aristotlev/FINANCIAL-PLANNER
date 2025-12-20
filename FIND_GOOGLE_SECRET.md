# How to Find Your Google Client Secret

Follow these exact steps to get your Client Secret:

1.  **Click this Direct Link:**
    [https://console.cloud.google.com/apis/credentials?project=629380503119](https://console.cloud.google.com/apis/credentials?project=629380503119)

2.  **Find Your App:**
    *   Look under the section **"OAuth 2.0 Client IDs"**.
    *   You should see a name like "Omnifolio" or "Web client 1".
    *   Click the **Pencil Icon (Edit)** ✏️ on the right side of that row.

3.  **Copy the Secret:**
    *   On the next page, look at the **right side** of the screen.
    *   You will see a field labeled **"Client secret"**.
    *   It will look like `GOCSPX-xxxxxxxxxxxxxxxx`.
    *   Click the **Copy Icon** 📋 next to it.

4.  **Update Your App:**
    *   Come back here and run this command (replace `PASTE_SECRET_HERE` with what you copied):

    ```bash
    gcloud run services update financial-planner --region=europe-west1 --update-env-vars=GOOGLE_CLIENT_SECRET=PASTE_SECRET_HERE
    ```
