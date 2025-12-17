# Deployment Guide: From Zero to Production on AWS

This guide covers everything from creating the server to automating the deployment.

## Phase 1: Create the Server (AWS EC2)

1.  **Log in to AWS Console** and search for **EC2**.
2.  Click **Launch Instance** (orange button).
3.  **Name:** `AudioraServer`
4.  **Application and OS Images (AMI):**
    *   Select **Ubuntu**.
    *   Ensure it says "Free tier eligible" (usually Ubuntu Server 24.04 or 22.04 LTS).
5.  **Instance Type:**
    *   Select `t2.micro` or `t3.micro` (Free tier eligible).
6.  **Key pair (login):**
    *   Click **Create new key pair**.
    *   Name: `audiora-key`.
    *   Key pair type: `RSA`.
    *   Private key file format: `.pem`.
    *   Click **Create key pair**.
    *   **IMPORTANT:** A file named `audiora-key.pem` will download. **Save this file safely!** You cannot download it again.
7.  **Network settings:**
    *   Click **Edit** (top right of this box).
    *   **Auto-assign public IP:** Enable.
    *   **Firewall (security groups):** Select "Create security group".
    *   **Inbound Security Group Rules:**
        *   Rule 1 (SSH): Type: `SSH`, Port: `22`, Source: `Anywhere` (0.0.0.0/0).
        *   Rule 2 (HTTP): Click "Add security group rule", Type: `HTTP`, Port: `80`, Source: `Anywhere`.
        *   Rule 3 (HTTPS): Click "Add security group rule", Type: `HTTPS`, Port: `443`, Source: `Anywhere`.
8.  Click **Launch Instance**.
9.  Go back to the **Instances** list and wait for "Instance state" to be **Running**.
10. Click on your instance and copy the **Public IPv4 address** (e.g., `54.123.45.67`).

---

## Phase 2: Prepare the Server

1.  **Open a Terminal** on your computer (PowerShell on Windows, Terminal on Mac).
2.  **Navigate** to where you saved the key:
    ```powershell
    cd Downloads
    ```
3.  **Connect to the server:**
    *(Replace `54.123.45.67` with your actual IP address)*
    ```powershell
    ssh -i "audiora-key.pem" ubuntu@54.123.45.67
    ```
    *Type `yes` if asked about authenticity.*

4.  **Install Docker** (Run these commands one by one on the server):
    ```bash
    # 1. Update package list
    sudo apt-get update

    # 2. Install Docker
    sudo apt-get install -y docker.io docker-compose-v2

    # 3. Allow your user to run Docker commands
    sudo usermod -aG docker $USER

    # 4. Apply changes (this will log you out)
    exit
    ```

---

## Phase 3: Connect GitHub to AWS

1.  **Open your `.pem` file** (the one you downloaded) with Notepad or VS Code.
2.  **Copy everything** inside (starts with `-----BEGIN RSA PRIVATE KEY-----`).
3.  Go to your **GitHub Repository** -> **Settings** -> **Secrets and variables** -> **Actions**.
4.  Click **New repository secret** and add these 3 secrets:

    | Name | Value |
    |------|-------|
    | `VPS_HOST` | Your AWS Public IP (e.g., `54.123.45.67`) |
    | `VPS_USERNAME` | `ubuntu` |
    | `VPS_SSH_KEY` | Paste the entire content of your `.pem` file |

---

## Phase 4: Deploy!

1.  **Push your code** to GitHub (if you haven't already).
    ```bash
    git add .
    git commit -m "Setup deployment pipeline"
    git push origin main
    ```
2.  Go to the **Actions** tab in your GitHub repository.
3.  You should see a workflow running. Click on it to watch the progress.
4.  Once it finishes (green checkmark), open your browser and go to:
    `http://<your-aws-ip>`

---

## Troubleshooting

*   **"Permission denied (publickey)":**
    *   Make sure you are using the correct `.pem` file.
    *   Make sure you copied the *entire* key into GitHub Secrets.
*   **"Connection timed out":**
    *   Check your AWS Security Group rules. Ensure Port 80 and 22 are open to 0.0.0.0/0.
*   **Site can't be reached:**
    *   Wait 1-2 minutes after deployment.
    *   SSH into the server and run `docker compose logs -f` to see if the app crashed.
