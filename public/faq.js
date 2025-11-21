document.addEventListener('DOMContentLoaded', () => {
    const dashboardBtn = document.getElementById('dashboard-btn');

    dashboardBtn.addEventListener('click', () => {
        window.location.href = '/dashboard.html';
    });
});