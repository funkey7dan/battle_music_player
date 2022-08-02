<script>
    /**##################### IMPORTS ######################*/
    import {
        Button,
        ButtonGroup,
        Container,
        Col,
        Row,
        Progress,
    } from "sveltestrap";
    import { createEventDispatcher } from "svelte";
    import { Howl, Howler } from "howler";

    /**##################### DECLARATIONS ######################*/

    //const { dialog } = require("electron").dialog;
    //console.log(dialog);
    const dispatch = createEventDispatcher();
    var isPlaying = false;
    var myInterval;
    Howler.preload = true;

    var sound = new Howl({
        src: ["track.mp3"],
        onplay: function () {
            myInterval = setInterval(() => {
                requestAnimationFrame(updateProgress);
            }, 100);
        },
    });
    let seekStatus = sound.seek() || 0;
    let timerLeft = sound.duration();
    let trackProgress = (sound.seek() / sound.duration()) * 100 || 0;
    sound.on("end", function () {
        isPlaying = false;
        trackProgress = 100;
        clearInterval(myInterval);
    });

    /**##################### FUNCTIONS ######################*/
    function playSound() {
        isPlaying = true;
        //console.log(sound);
        sound.play();
    }

    function pauseSound() {
        isPlaying = false;
        sound.pause();
    }

    function playNext() {
    }

    function updateProgress() {
        if (sound.playing()) {
            seekStatus = sound.seek() || 0;
            trackProgress = (seekStatus / sound.duration()) * 100 || 0;
            timerLeft = sound.duration() - seekStatus;
            //console.log(trackProgress);
        }
    }
</script>

<Container>
    <Row>
        <Col>{Math.round(seekStatus)}</Col>
        <Col>{Math.round(timerLeft)}</Col>
    </Row>
    <Progress
        color="danger"
        bind:trackProgress
        on:click={(e) => console.log(e)}
    />

    <br />
    <ButtonGroup>
        <Button>Prev</Button>
        {#if isPlaying}
            <Button on:click={pauseSound}>Pause</Button>
        {:else}
            <Button on:click={playSound}>Play</Button>
        {/if}
        <Button on:click={playNext}>Next</Button>
    </ButtonGroup>
</Container>

<style>
    /* your styles go here */
</style>
