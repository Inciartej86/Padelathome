/**
 * Formats a date string or Date object into a readable string (e.g., "22 de noviembre de 2025").
 * @param {string | Date} date - The date to format.
 * @returns {string} The formatted date string.
 */
export const formatDate = (date) => new Date(date).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
});

/**
 * Formats a date string or Date object into a 24-hour time string (e.g., "14:30").
 * @param {string | Date} date - The date to format.
 * @returns {string} The formatted time string.
 */
export const formatTime = (date) => new Date(date).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
});

/**
 * Displays a notification message on the screen.
 * It dynamically finds a container with the ID 'notification-container'.
 * If the container doesn't exist, it falls back to a simple alert.
 * @param {string} message - The message to display.
 * @param {string} [type='info'] - The type of notification ('success', 'error', 'info').
 * @param {number} [duration=3000] - Duration in milliseconds before the notification disappears.
 */
export const showNotification = (message, type = 'info', duration = 3000) => {
    const container = document.getElementById('notification-container');
    
    if (!container) {
        console.warn('Notification container not found in DOM. Using alert() as a fallback.');
        alert(message);
        return;
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    // Add class to trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Remove the notification after the specified duration
    setTimeout(() => {
        notification.classList.remove('show');
        // Remove from DOM after transition ends
        notification.addEventListener('transitionend', () => notification.remove());
    }, duration);
};
