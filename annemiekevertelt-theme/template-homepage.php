<?php
/**
 * Template Name: Homepage
 */

get_header();
?$>

<!-- Category Columns -->
<section class="category-columns">
    
    <!-- Columns -->
    <article class="category-column columns" data-category="columns">
        <div class="category-header">
            <h2 class="category-title">Columns</h2>
        </div>
        <div class="category-preview">
            <?php
            $columns = new WP_Query([
                'post_type' => 'columns',
                'posts_per_page' => 3,
                'orderby' => 'date',
                'order' => 'DESC'
            ]);
            
            if($columns->have_posts()) :
                while($columns->have_posts()) : $columns->the_post();
            ?>
                <div class="category-preview-item">
                    <?php the_title(); ?>
                </div>
            <?php
                endwhile;
                wp_reset_postdata();
            else :
                echo '<div class="category-preview-item">Nog geen columns...</div>';
            endif;
            ?>
        </div>
        
        <div class="post-grid" id="columns-grid">
            <?php
            if($columns->have_posts()) :
                while($columns->have_posts()) : $columns->the_post();
            ?>
                <div class="post-card" data-post-id="<?php the_ID(); ?>">
                    <?php if(has_post_thumbnail()) : ?>
                        <?php the_post_thumbnail('column-thumb'); ?>
                    <?php endif; ?>
                    <div class="post-card-title"><?php the_title(); ?></div>
                </div>
            <?php
                endwhile;
                wp_reset_postdata();
            endif;
            ?>
        </div>
    </article>
    
    <!-- Kinderverhalen -->
    <article class="category-column kinderverhalen" data-category="kinderverhalen">
        <div class="category-header">
            <h2 class="category-title">Kinderverhalen</h2>
        </div>
        <div class="category-preview">
            <?php
            $kinderen = new WP_Query([
                'post_type' => 'kinderverhalen',
                'posts_per_page' => 3,
                'orderby' => 'date',
                'order' => 'DESC'
            ]);
            
            if($kinderen->have_posts()) :
                while($kinderen->have_posts()) : $kinderen->the_post();
            ?>
                <div class="category-preview-item">
                    <?php the_title(); ?>
                </div>
            <?php
                endwhile;
                wp_reset_postdata();
            else :
                echo '<div class="category-preview-item">Nog geen verhalen...</div>';
            endif;
            ?>
        </div>
        
        <div class="post-grid" id="kinderverhalen-grid">
            <?php
            if($kinderen->have_posts()) :
                while($kinderen->have_posts()) : $kinderen->the_post();
            ?>
                <div class="post-card" data-post-id="<?php the_ID(); ?>">
                    <?php if(has_post_thumbnail()) : ?>
                        <?php the_post_thumbnail('column-thumb'); ?>
                    <?php endif; ?>
                    <div class="post-card-title"><?php the_title(); ?></div>
                </div>
            <?php
                endwhile;
                wp_reset_postdata();
            endif;
            ?>
        </div>
    </article>
    
    <!-- Audio -->
    <article class="category-column audio" data-category="audio">
        <div class="category-header">
            <h2 class="category-title">Audio</h2>
        </div>
        <div class="category-preview">
            <?php
            $audio = new WP_Query([
                'post_type' => 'audio',
                'posts_per_page' => 3,
                'orderby' => 'date',
                'order' => 'DESC'
            ]);
            
            if($audio->have_posts()) :
                while($audio->have_posts()) : $audio->the_post();
            ?>
                <div class="category-preview-item">
                    <?php the_title(); ?>
                </div>
            <?php
                endwhile;
                wp_reset_postdata();
            else :
                echo '<div class="category-preview-item">Nog geen audio...</div>';
            endif;
            ?>
        </div>
        
        <div class="post-grid" id="audio-grid">
            <?php
            if($audio->have_posts()) :
                while($audio->have_posts()) : $audio->the_post();
            ?>
                <div class="post-card" data-post-id="<?php the_ID(); ?>">
                    <?php if(has_post_thumbnail()) : ?>
                        <?php the_post_thumbnail('column-thumb'); ?>
                    <?php endif; ?>
                    <div class="post-card-title"><?php the_title(); ?></div>
                </div>
            <?php
                endwhile;
                wp_reset_postdata();
            endif;
            ?>
        </div>
    </article>
    
    <!-- Wie ben ik? -->
    <article class="category-column wie-ben-ik" data-category="wie-ben-ik">
        <div class="category-header">
            <h2 class="category-title">Wie ben ik?</h2>
        </div>
        <div class="category-preview">
            <div class="category-preview-item">
                Lees meer over Annemieke...
            </div>
        </div>
    </article>

</section>

<!-- Mocht je me gemist hebben -->
<section class="missed-section">
    <?php echo do_shortcode('[mocht_je_me_gemist_hebben]'); ?>
</section>

<?php
get_footer();
