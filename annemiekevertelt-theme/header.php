<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
    
    <!-- Hamburger Menu -->
    <button class="menu-toggle" aria-label="Menu">
        <span></span>
        <span></span>
        <span></span>
    </button>
    
    <!-- Navigation Overlay -->
    <div class="nav-overlay"></div>
    
    <!-- Main Navigation -->
    <nav class="main-navigation">
        <?php
        wp_nav_menu([
            'theme_location' => 'primary',
            'container' => false,
            'menu_class' => 'nav-menu',
            'fallback_cb' => function() {
                echo '<ul>';
                echo '<li><a href="' . home_url() . '">Home</a></li>';
                echo '<li><a href="' . get_post_type_archive_link('columns') . '">Columns</a></li>';
                echo '<li><a href="' . get_post_type_archive_link('kinderverhalen') . '">Kinderverhalen</a></li>';
                echo '<li><a href="' . get_post_type_archive_link('audio') . '">Audio</a></li>';
                echo '<li><a href="/wie-ben-ik">Wie ben ik?</a></li>';
                echo '</ul>';
            }
        ]);
        ?>
    </nav>
    
    <header class="site-header">
        <a href="<?php echo esc_url(home_url('/')); ?>" class="site-title">
            <?php bloginfo('name'); ?>
        </a>
    </header>
    
    <main class="site-main">