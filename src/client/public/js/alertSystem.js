export class AlertSystem {
    constructor() {
        this.alertsContainer = document.getElementById('alertsContainer');
        if (!this.alertsContainer) {
            this.alertsContainer = document.createElement('div');
            this.alertsContainer.id = 'alertsContainer';
            document.body.appendChild(this.alertsContainer);
        }

        // Check for stored alerts when the system initializes
        this.checkStoredAlerts();
    }

    storePendingAlert(message, type = 'danger') {
        const pendingAlert = {
            message,
            type,
            timestamp: Date.now()
        };
        localStorage.setItem('pendingAlert', JSON.stringify(pendingAlert));
    }

    checkStoredAlerts() {
        const storedAlert = localStorage.getItem('pendingAlert');
        if (storedAlert) {
            try {
                const { message, type, timestamp } = JSON.parse(storedAlert);

                // Only show alerts that are less than 5 seconds old
                if (Date.now() - timestamp < 5000) {
                    this.showAlert(message, type);
                }

                // Clear the stored alert
                localStorage.removeItem('pendingAlert');
            } catch (error) {
                console.error('Error processing stored alert:', error);
                localStorage.removeItem('pendingAlert');
            }
        }
    }

    showAlert(message, type = 'danger', duration = 3000) {
        const alertDiv = document.createElement('div');

        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.setAttribute('role', 'alert');

        const messageSpan = document.createElement('span');
        messageSpan.className = 'alert-message';
        messageSpan.textContent = message;

        const closeButton = document.createElement('button');
        closeButton.className = 'btn-close';
        closeButton.setAttribute('type', 'button');
        closeButton.setAttribute('data-bs-dismiss', 'alert');
        closeButton.setAttribute('aria-label', 'Close');

        // Assemble the alert
        alertDiv.appendChild(messageSpan);
        alertDiv.appendChild(closeButton);

        // Add the alert to the container
        this.alertsContainer.appendChild(alertDiv);

        // Add click handler for close button
        closeButton.addEventListener('click', () => {
            alertDiv.remove();
        });

        // Auto-remove the alert after duration
        setTimeout(() => {
            if (alertDiv && alertDiv.parentElement) {
                alertDiv.classList.remove('show');
                setTimeout(() => alertDiv.remove(), 150);
            }
        }, duration);
    }

    showSuccess(message, persistent = false, duration = 3000) {
        if (persistent) {
            this.storePendingAlert(message, 'success');
        } else {
            this.showAlert(message, 'success', duration);
        }
    }

    showError(message, persistent = false, duration = 3000) {
        if (persistent) {
            this.storePendingAlert(message, 'danger');
        } else {
            this.showAlert(message, 'danger', duration);
        }
    }
}

// Create and export a singleton instance
export const alertSystem = new AlertSystem();