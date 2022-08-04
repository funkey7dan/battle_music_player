<script>
    import { Button, Container, ListGroup, ListGroupItem } from "sveltestrap";
    const ipc = require("electron").ipcRenderer;
    import { createEventDispatcher } from "svelte";
    import { filelist_store } from "./stores";
    const dispatch = createEventDispatcher();
    var filelist;
    let buttons = [];
    filelist_store.subscribe((value) => (filelist = value));
    ipc.send("request_files");
    ipc.on("music_files", function (event, arg) {
        console.log(event);
        filelist = arg;
        console.log("ipc got " + arg);
    });

    ipc.on("file_path", function (event, arg) {});

    function onKeyDown(e) {
        if (e.keyCode >= 48 && e.keyCode <= 57) {
            dispatch("play_message", buttons[e.keyCode - 48].outerText);
        } else if (e.keyCode >= 96 && e.keyCode <= 105) {
            dispatch("play_message", buttons[e.keyCode - 96].outerText);
        }
    }
</script>

<main>
    <ListGroup style="border:none">
        {#if filelist}
            <!-- content here -->
            {#each filelist as item, i}
                <ListGroupItem style="border:none">
                    <Button
                        bind:inner={buttons[(i + 1) % filelist.length]}
                        on:click={() => dispatch("play_message", item.name)}
                    >
                        {item.name}
                    </Button>
                </ListGroupItem>
            {/each}
        {/if}
    </ListGroup>
</main>

<svelte:window on:keydown|preventDefault={onKeyDown} />

<style>
    /* your styles go here */
</style>
