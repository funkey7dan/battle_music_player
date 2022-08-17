<script>
    import {
        Button,
        Container,
        ListGroup,
        ListGroupItem,
        NavItem,
        Col,
    } from "sveltestrap";
    const ipc = require("electron").ipcRenderer;
    import { createEventDispatcher } from "svelte";
    import { filelist_store, state } from "./stores";
    let keyboard = {
        KEY_D: 68,
        KEY_V: 86,
        NUMPAD_0: 96,
        NUMPAD_9: 105,
        KEY_0: 48,
        KEY_9: 57,
        BACKSPACE: 8,
    };
    const dispatch = createEventDispatcher();
    var filelist;
    let buttons = [];
    let toIgnore = ["town", "defeat", "victory", "Preparation"];
    //let state = $gameState;
    $state = "battle";
    filelist_store.subscribe((value) => (filelist = value));
    ipc.send("request_files");
    ipc.on("music_files", function (event, arg) {
        console.log(event);
        filelist = arg;
        console.log("ipc got " + arg);
    });

    function onKeyDown(e) {
        if (e.keyCode > keyboard.KEY_0 && e.keyCode <= keyboard.KEY_9) {
            dispatch("play_message", buttons[e.keyCode - 48 + 1].outerText);
        } else if (
            e.keyCode > keyboard.NUMPAD_0 &&
            e.keyCode <= keyboard.NUMPAD_9
        ) {
            dispatch("play_message", buttons[e.keyCode - 96 + 1].outerText);
        } else if (e.keyCode == keyboard.KEY_D) {
            dispatch("play_message", "defeat");
        } else if (e.keyCode == keyboard.KEY_V) {
            dispatch("play_message", "victory");
        } else if (
            e.keyCode === keyboard.NUMPAD_0 ||
            e.keyCode === keyboard.KEY_0
        ) {
            dispatch("play_message", buttons[11].outerText);
        } else if (e.keyCode === keyboard.BACKSPACE) {
            $state === "battle"
                ? dispatch("play_message", "town")
                : ($state = "battle");
        }
    }
</script>

<main>
    <div class="row">
        <div class="col-4">
            {#if $state === "battle"}
                <Button
                    class="btn-danger"
                    on:click={() => dispatch("play_message", "defeat")}
                    >Defeat</Button
                >
            {/if}
        </div>
        <div class="col-4">
            <ListGroup style="border:none">
                <!-- Check if the filelist is loaded -->
                {#if filelist}
                    <!-- Differentiate between the battle controls and the city mode -->
                    {#if $state === "battle"}
                        <ListGroupItem style="border:none">
                            <Button
                                on:click={() =>
                                    dispatch("play_message", "Preparation")}
                            >
                                Preparation
                            </Button>
                        </ListGroupItem>
                        {#each filelist as item, i}
                            {#if !toIgnore.includes(item.name)}
                                <ListGroupItem style="border:none">
                                    <Button
                                        bind:inner={buttons[
                                            (i + 1) % filelist.length
                                        ]}
                                        on:click={() =>
                                            dispatch("play_message", item.name)}
                                    >
                                        {item.name}
                                    </Button>
                                </ListGroupItem>
                            {/if}
                        {/each}
                    {:else if $state === "town"}
                        Just chilling...
                    {/if}
                {/if}
                <ListGroupItem style="border:none">
                    <Button
                        on:click={() => {
                            if ($state === "town") $state = "battle";
                            else if ($state === "battle") {
                                $state = "town";
                                dispatch("play_message", "town");
                            }
                        }}
                    >
                        {$state === "town" ? "To Battle!" : "Back to town"}
                    </Button>
                </ListGroupItem>
            </ListGroup>
        </div>
        <div class="col-4">
            {#if $state === "battle"}
                <Button
                    class="btn-success"
                    on:click={() => dispatch("play_message", "victory")}
                    >Victory</Button
                >
            {/if}
        </div>
    </div>
</main>

<svelte:window on:keydown|preventDefault={onKeyDown} />

<style>
</style>
