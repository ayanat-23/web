let unreadCount = 0;
const userLoggedIn = true;
let currentFilter = 'all';

window.addEventListener('load', function() {
    alert('Welcome to your Notifications page!');
});


const notifications = [
    {
        id: 1,
        avatar: 'images/a.jpg',
        text: 'Ayanat Kabdygaliyeva liked your post',
        time: '2 hours ago',
        type: 'likes',
        unread: true
    },
    {
        id: 2,
        avatar: 'images/s.jpg',
        text: 'Sabina Samatova mentioned you in a comment',
        time: '5 hours ago',
        type: 'mentions',
        unread: true
    },
    {
        id: 3,
        avatar: 'images/i.jpg',
        text: 'Inkar Tlebaldina sent you a friend request',
        time: '1 day ago',
        type: 'friends',
        unread: false
    }
];

function displayNotifications(notifs, filter = 'all') {
    const container = document.getElementById('notificationsContainer');
    container.innerHTML = ''; 
    for (let i = 0; i < notifs.length; i++) {
        const notif = notifs[i];
        
        
        if (filter !== 'all' && 
            ((filter === 'unread' && !notif.unread) || 
             (filter !== 'unread' && notif.type !== filter))) {
            continue;
        }
      
        const notifElement = document.createElement('div');
        notifElement.className = 'notification-item';
        if (notif.unread) {
            notifElement.classList.add('unread');
        }
        
     
        notifElement.innerHTML = `
            <img src="${notif.avatar}" alt="User" class="notification-avatar">
            <div class="notification-content">
                <p class="notification-text">${notif.text}</p>
                <p class="notification-time">${notif.time}</p>
            </div>
            <div class="notification-actions-menu">
                <button class="notification-menu-btn" data-id="${notif.id}">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </div>
        `;
        
        container.appendChild(notifElement);
    }
    
   
    updateUnreadCount();
}

function updateUnreadCount() {
    unreadCount = 0;
    for (let i = 0; i < notifications.length; i++) {
        if (notifications[i].unread) {
            unreadCount++;
        }
    }
    
    document.getElementById('notifCount').textContent = unreadCount;
}

document.getElementById('markAllRead').addEventListener('click', function() {
    for (let i = 0; i < notifications.length; i++) {
        notifications[i].unread = false;
    }
    displayNotifications(notifications, currentFilter);
});

document.getElementById('refreshNotifs').addEventListener('click', function() {
    const randomId = Math.floor(Math.random() * 1000) + 4;
    
    notifications.push({
        id: randomId,
        avatar: '/api/placeholder/50/50',
        text: 'New notification #' + randomId,
        time: 'Just now',
        type: ['likes', 'mentions', 'friends'][Math.floor(Math.random() * 3)],
        unread: true
    });
    
    displayNotifications(notifications, currentFilter);
});

const filterButtons = document.querySelectorAll('.filter-btn');
filterButtons.forEach(button => {
    button.addEventListener('click', function() {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        
        this.classList.add('active');
        
        currentFilter = this.getAttribute('data-filter');
        displayNotifications(notifications, currentFilter);
    });
});

document.getElementById('loadMoreBtn').addEventListener('click', function() {
    const newNotification = {
        id: notifications.length + 1,
        avatar: 'images/i.jpg',
        text: 'Older notification loaded',
        time: '3 days ago',
        type: 'mentions',
        unread: false
    };
    

    if ((notifications.length % 2) === 0) {
        newNotification.type = 'likes';
    }
    
    notifications.push(newNotification);
    displayNotifications(notifications, currentFilter);
});


displayNotifications(notifications);