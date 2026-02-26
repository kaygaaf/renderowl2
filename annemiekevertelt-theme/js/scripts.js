(function($) {
    'use strict';
    
    // Menu Toggle
    $('.menu-toggle').on('click', function() {
        $('.main-navigation').toggleClass('active');
        $('.nav-overlay').toggleClass('active');
    });
    
    $('.nav-overlay').on('click', function() {
        $('.main-navigation').removeClass('active');
        $('.nav-overlay').removeClass('active');
    });
    
    // Category Column Click - Show Grid
    $('.category-column').on('click', function(e) {
        // Don't trigger if clicking on a post card
        if($(e.target).closest('.post-card').length) return;
        
        var category = $(this).data('category');
        var grid = $('#' + category + '-grid');
        
        // Toggle grid visibility
        if(grid.hasClass('active')) {
            grid.removeClass('active');
            $(this).find('.category-preview').show();
        } else {
            // Hide all other grids
            $('.post-grid').removeClass('active');
            $('.category-preview').show();
            
            // Show this grid
            grid.addClass('active');
            $(this).find('.category-preview').hide();
        }
    });
    
    // Post Card Click - Page Turn Effect
    $('.post-card').on('click', function() {
        var postId = $(this).data('post-id');
        loadPostContent(postId);
    });
    
    // Close Page Turn Modal
    $('.page-turn-close').on('click', closePageTurn);
    
    // Close on escape key
    $(document).on('keydown', function(e) {
        if(e.key === 'Escape') closePageTurn();
    });
    
    // Close on click outside
    $('.page-turn-container').on('click', function(e) {
        if(e.target === this) closePageTurn();
    });
    
    function loadPostContent(postId) {
        var modal = $('#pageTurnModal');
        var content = modal.find('.page-turn-content');
        
        // Show loading
        content.html('<div style="text-align:center;padding:2rem;">Laden...</div>');
        modal.addClass('active');
        
        // AJAX load post content
        $.ajax({
            url: annemieke_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'load_post_content',
                post_id: postId,
                nonce: annemieke_ajax.nonce
            },
            success: function(response) {
                if(response.success) {
                    content.html(response.data.content);
                } else {
                    content.html('<p>Er is een fout opgetreden.</p>');
                }
            },
            error: function() {
                content.html('<p>Er is een fout opgetreden.</p>');
            }
        });
    }
    
    function closePageTurn() {
        $('#pageTurnModal').removeClass('active');
    }
    
    // Smooth scroll for anchor links
    $('a[href^="#"]').on('click', function(e) {
        e.preventDefault();
        var target = $(this.getAttribute('href'));
        if(target.length) {
            $('html, body').animate({
                scrollTop: target.offset().top - 100
            }, 500);
        }
    });
    
})(jQuery);
