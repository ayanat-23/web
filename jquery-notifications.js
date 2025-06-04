$(document).ready(function() {
    $(document).on('click', '.notification-menu-btn', function() {
        const notifId = $(this).data('id');
        
        if (!$(this).next('.dropdown-menu').length) {
            const menu = $('<div class="dropdown-menu">')
                .append('<button class="dropdown-item mark-read">Mark as read</button>')
                .append('<button class="dropdown-item delete-notif">Delete</button>');
            
            $(this).after(menu);
            menu.fadeIn(200);
        } else {
            $(this).next('.dropdown-menu').fadeToggle(200);
        }
    });
 
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.notification-actions-menu').length) {
            $('.dropdown-menu').fadeOut(200);
        }
    });

    $(document).on('click', '.mark-read', function() {
        const notifItem = $(this).closest('.notification-item');

        notifItem.animate({
            borderLeftWidth: '0'
        }, 300, function() {
            $(this).removeClass('unread');

            const notifId = parseInt($(this).find('.notification-menu-btn').data('id'));
            for (let i = 0; i < notifications.length; i++) {
                if (notifications[i].id === notifId) {
                    notifications[i].unread = false;
                    break;
                }
            }
            
            updateUnreadCount();
        });

        $(this).closest('.dropdown-menu').fadeOut(200);
    });

    $(document).on('click', '.delete-notif', function() {
        const notifItem = $(this).closest('.notification-item');
        const notifId = parseInt(notifItem.find('.notification-menu-btn').data('id'));

        notifItem.slideUp(300, function() {
            $(this).remove();
            for (let i = 0; i < notifications.length; i++) {
                if (notifications[i].id === notifId) {
                    notifications.splice(i, 1);
                    break;
                }
            }

            updateUnreadCount();
        });
    });

    $('.filter-btn').hover(
        function() {
            $(this).css('transform', 'scale(1.05)');
        },
        function() {
            $(this).css('transform', 'scale(1)');
        }
    );

    $(document).on('mouseenter', '.notification-item', function() {
        $(this).css('background-color', '#f9f0f5');
    }).on('mouseleave', '.notification-item', function() {
        if ($(this).hasClass('unread')) {
            $(this).css('background-color', '#fcf6f9');
        } else {
            $(this).css('background-color', '#fff');
        }
    });

    $('<style>')
        .prop('type', 'text/css')
        .html(`
            .dropdown-menu {
                position: absolute;
                right: 0;
                background: white;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                display: none;
                z-index: 10;
                min-width: 120px;
            }
            .dropdown-item {
                display: block;
                padding: 8px 12px;
                width: 100%;
                text-align: left;
                border: none;
                background: none;
                cursor: pointer;
            }
            .dropdown-item:hover {
                background-color: #fcddec;
            }
        `)
        .appendTo('head');
});