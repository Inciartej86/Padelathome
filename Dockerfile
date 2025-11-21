# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Install cron
RUN apk add --no-cache cron

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Add the cron job to the crontab
# Ensure the cronjob.conf has the correct path to the script
RUN crontab cronjob.conf

# Make the entrypoint script executable
RUN chmod +x entrypoint.sh

# Expose the port the app runs on
EXPOSE 3000

# Use the entrypoint script to start cron and the main application
ENTRYPOINT ["./entrypoint.sh"]

# Default command to run when the container starts (executed by entrypoint.sh)
CMD ["npm", "start"]
