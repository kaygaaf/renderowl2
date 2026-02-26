    </main>
    
    <footer class="site-footer">
        <p>&copy; <?php echo date('Y'); ?> <?php bloginfo('name'); ?>. Alle rechten voorbehouden.</p>
    </footer>
    
    <!-- Page Turn Modal -->
    <div class="page-turn-container" id="pageTurnModal">
        <button class="page-turn-close">&times;</button>
        <div class="page-turn-content">
            <!-- Content loaded via AJAX -->
        </div>
    </div>
    
    <?php wp_footer(); ?>
</body>
</html>