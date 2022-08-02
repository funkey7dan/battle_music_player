<script>
    import { trackProgress } from "./stores";
    //progress.style.width = ((seek / sound.duration()) * 100 || 0) + '%';
    //progressBar.style.width = $trackProgress + "%";
</script>

<main>
    <div class="progressBar">
        <div
            id="progressBar"
            class="progress-bar bg-success"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            style="width: {$trackProgress + '%'}"
        />
    </div>
</main>

<style>
</style>
