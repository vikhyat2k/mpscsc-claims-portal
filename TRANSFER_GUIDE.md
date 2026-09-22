# MPSCSC Claims Portal - Transfer Guide

Follow these steps to move the project to another computer without losing any data.

## Step 1: On the OLD Computer (Source)

1.  Run the **`package_for_transfer.bat`** file in the project folder.
2.  This will create a ZIP file named `mpscsc-claims-portal_backup_YYYYMMDD_HHMM.zip`.
3.  Copy this ZIP file to a USB drive, cloud storage, or send it to the new computer.

## Step 2: On the NEW Computer (Destination)

1.  **Install Node.js**: Ensure Node.js is installed on the new computer. You can download it from [nodejs.org](https://nodejs.org/).
2.  **Extract**: Unzip the `mpscsc-claims-portal_backup_...zip` file to a desired location (e.g., Desktop or Documents).
3.  **Install Dependencies**:
    *   Open the extracted folder.
    *   Double-click **`install_dependencies.bat`**.
    *   Wait for the process to complete (internet connection required).

## Step 3: Run the Application

1.  Double-click **`run_portal.bat`** to start the application.
2.  The portal should open in your browser automatically.
3.  All your data (employees, claims, etc.) will be preserved.

## Important Notes

*   **Database**: The database file (`server/claims.db`) is included in the backup ZIP, so all your data is safe.
*   **Node Modules**: The `node_modules` folders are intentionally excluded from the backup to keep the file size small. The `install_dependencies.bat` script re-downloads them on the new machine.
