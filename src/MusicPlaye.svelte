<script>
    import { Button, ButtonGroup, Container, Col, Row } from "sveltestrap";
    import { createEventDispatcher } from "svelte";
    import { Howl, Howler } from "howler";
    const dispatch = createEventDispatcher();
    var isPlaying = false;
    let centerBtn = "Play";
    var sound = new Howl({
        src: ["sound.wav"],
    });
    sound.on("end", function () {
        isPlaying = false;
    });
    function playSound() {
        isPlaying = true;
        console.log(sound);
        sound.play();
    }

    function pauseSound() {
        isPlaying = false;
        sound.stop();
    }
</script>

<Container>
    <ButtonGroup>
        <Button>Prev</Button>
        {#if isPlaying}
            <Button on:click={pauseSound}>Pause</Button>
        {:else}
            <Button on:click={playSound}>Play</Button>
        {/if}
        <Button>Next</Button>
    </ButtonGroup>
</Container>

<style>
    /* your styles go here */
</style>
