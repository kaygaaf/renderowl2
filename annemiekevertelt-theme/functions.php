<?php
/**
 * Theme Name: Annemieke Vertelt
 * Description: Custom theme voor Annemieke Vertelt - geïnspireerd op Paulien Cornelisse
 * Version: 1.0
 * Author: Antigravity
 * Text Domain: annemieke-vertelt
 */

// Theme setup
add_action('after_setup_theme', function() {
    add_theme_support('post-thumbnails');
    add_theme_support('title-tag');
    add_theme_support('html5', ['search-form', 'comment-form', 'comment-list', 'gallery', 'caption']);
    
    // Custom image sizes
    add_image_size('column-thumb', 400, 300, true);
    
    // Register menus
    register_nav_menus([
        'primary' => __('Hoofdmenu', 'annemieke-vertelt'),
        'categories' => __('Categorieën', 'annemieke-vertelt')
    ]);
});

// Enqueue styles and scripts
add_action('wp_enqueue_scripts', function() {
    wp_enqueue_style('annemieke-style', get_stylesheet_uri(), [], '1.0');
    wp_enqueue_style('annemieke-custom', get_template_directory_uri() . '/css/custom.css', [], '1.0');
    wp_enqueue_script('annemieke-scripts', get_template_directory_uri() . '/js/scripts.js', ['jquery'], '1.0', true);
    
    // Pass AJAX URL to script
    wp_localize_script('annemieke-scripts', 'wp_ajax', [
        'ajax_url' => admin_url('admin-ajax.php')
    ]);
});

// Custom post types
add_action('init', function() {
    // Columns post type
    register_post_type('columns', [
        'labels' => [
            'name' => __('Columns', 'annemieke-vertelt'),
            'singular_name' => __('Column', 'annemieke-vertelt'),
            'add_new' => __('Nieuwe column', 'annemieke-vertelt'),
        ],
        'public' => true,
        'has_archive' => true,
        'supports' => ['title', 'editor', 'thumbnail', 'excerpt'],
        'menu_icon' => 'dashicons-format-quote',
        'rewrite' => ['slug' => 'columns'],
    ]);
    
    // Kinderverhalen post type
    register_post_type('kinderverhalen', [
        'labels' => [
            'name' => __('Kinderverhalen', 'annemieke-vertelt'),
            'singular_name' => __('Kinderverhaal', 'annemieke-vertelt'),
        ],
        'public' => true,
        'has_archive' => true,
        'supports' => ['title', 'editor', 'thumbnail'],
        'menu_icon' => 'dashicons-book',
        'rewrite' => ['slug' => 'kinderverhalen'],
    ]);
    
    // Audio verhalen post type
    register_post_type('audio', [
        'labels' => [
            'name' => __('Audio', 'annemieke-vertelt'),
            'singular_name' => __('Audio verhaal', 'annemieke-vertelt'),
        ],
        'public' => true,
        'has_archive' => true,
        'supports' => ['title', 'editor', 'thumbnail'],
        'menu_icon' => 'dashicons-format-audio',
        'rewrite' => ['slug' => 'audio'],
    ]);
});

// Shortcode voor subkop
add_shortcode('mocht_je_me_gemist_hebben', function($atts) {
    $recent_posts = wp_get_recent_posts([
        'numberposts' => 3,
        'post_status' => 'publish'
    ]);
    
    $output = '<div class="missed-posts">';
    $output .= '<h3 class="missed-title">' . __('mocht je me gemist hebben', 'annemieke-vertelt') . '</h3>';
    $output .= '<div class="missed-list">';
    
    foreach($recent_posts as $post) {
        $output .= '<a href="' . get_permalink($post['ID']) . '" class="missed-item">';
        if(has_post_thumbnail($post['ID'])) {
            $output .= get_the_post_thumbnail($post['ID'], 'thumbnail');
        }
        $output .= '<span>' . $post['post_title'] . '</span>';
        $output .= '</a>';
    }
    
    $output .= '</div></div>';
    return $output;
});

// AJAX handler for loading post content
add_action('wp_ajax_load_post_content', 'load_post_content_ajax');
add_action('wp_ajax_nopriv_load_post_content', 'load_post_content_ajax');

function load_post_content_ajax() {
    $post_id = intval($_POST['post_id']);
    
    $post = get_post($post_id);
    
    if(!$post) {
        wp_send_json_error('Post niet gevonden');
    }
    
    $content = '<article class="single-post">';
    $content .= '<h1>' . esc_html($post->post_title) . '</h1>';
    
    if(has_post_thumbnail($post_id)) {
        $content .= get_the_post_thumbnail($post_id, 'large', ['class' => 'post-featured-image']);
    }
    
    $content .= '<div class="post-content">' . apply_filters('the_content', $post->post_content) . '</div>';
    $content .= '<div class="post-meta"><span class="post-date">' . get_the_date('', $post_id) . '</span></div>';
    $content .= '</article>';
    
    wp_send_json_success(['content' => $content]);
}
