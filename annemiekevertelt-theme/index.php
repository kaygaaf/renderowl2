<?php
/**
 * The main template file
 */

get_header();
?$>

<div class="content-area">
    <?php if(have_posts()) : ?>
        <?php while(have_posts()) : the_post(); ?>
            
            <article class="post">
                <?php if(has_post_thumbnail()) : ?>
                    <div class="post-thumbnail">
                        <?php the_post_thumbnail('large'); ?>
                    </div>
                <?php endif; ?>
                
                <header class="entry-header">
                    <h1 class="entry-title"><?php the_title(); ?></h1>
                </header>
                
                <div class="entry-content">
                    <?php the_content(); ?>
                </div>
            </article>
            
        <?php endwhile; ?>
        
    <?php else : ?>
        
        <p>Geen inhoud gevonden.</p>
        
    <?php endif; ?>
    
</div>

<?php
get_footer();
