<script>
    import {
        Button,
        Container,
        ListGroup,
        ListGroupItem,
        NavItem,
        Col,
        ButtonGroup,
    } from "sveltestrap";
    const ipc = require("electron").ipcRenderer;
    import { createEventDispatcher } from "svelte/internal";
    import { get_current_component } from "svelte/internal";
    import { filelist_store, state, narrationFilelist_store } from "./stores";
    const component = get_current_component();
    const svelteDispatch = createEventDispatcher();
    const dispatch = (name, detail) => {
        svelteDispatch(name, detail);
        component.dispatchEvent &&
            component.dispatchEvent(new CustomEvent(name, { detail }));
    };
    let keyboard = {
        KEY_D: 68,
        KEY_V: 86,
        NUMPAD_0: 96,
        NUMPAD_9: 105,
        KEY_0: 48,
        KEY_9: 57,
        BACKSPACE: 8,
        SPACE: 32,
        LEFT_ARROW: 37,
        UP_ARROW: 38,
        RIGHT_ARROW: 39,
        DOWN_ARROW: 40,
    };
    //const dispatch = createEventDispatcher();
    var filelist;
    var narrationFilelist;
    let buttons = [];
    let toIgnore = ["town", "defeat", "victory", "Preparation"];
    //let state = $gameState;
    $state = "battle";
    filelist_store.subscribe((value) => (filelist = value));
    // subscribe to changes in the store, and on change update the variable narrationFilelist
    narrationFilelist_store.subscribe((value) => (narrationFilelist = value));
    ipc.send("request_files");
    ipc.on("music_files", function (event, arg) {
        console.log(event);
        filelist = arg;
        console.log("ipc got " + arg);
    });

    function dispatchMouseClick(e) {
        dispatch("key_press", "click");
    }

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
            dispatch("key_press", "page");
        } else if (e.keyCode === keyboard.RIGHT_ARROW) {
            dispatch("key_press", "next");
        } else if (e.keyCode === keyboard.LEFT_ARROW) {
            dispatch("key_press", "prev");
        } else if (e.keyCode === keyboard.UP_ARROW) {
            dispatch("key_press", "volup");
        } else if (e.keyCode === keyboard.DOWN_ARROW) {
            dispatch("key_press", "voldown");
        } else if (e.keyCode === keyboard.SPACE) {
            dispatch("key_press", "space");
        }
    }
</script>

<main>
    <div class="row">
        <div class="col-4">
            {#if $state === "battle"}
                <Button
                    class="btn-danger"
                    on:click={() => {
                        dispatch("play_message", "defeat");
                        dispatch("key_press", "click");
                    }}>Defeat</Button
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
                            <!--TODO: Make this pretty!-->
                            <Button
                                on:click={() => {
                                    dispatch("key_press", "click");
                                    $state = "narration";
                                }}
                            >
                                Narration
                            </Button>
                        </ListGroupItem>
                        <ListGroupItem style="border:none">
                            <Button
                                on:click={() => {
                                    dispatch("play_message", "Preparation");
                                    dispatch("key_press", "click");
                                }}
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
                                        on:click={() => {
                                            dispatch("key_press", "click");
                                            dispatch("play_message", item.name);
                                        }}
                                    >
                                        {item.name}
                                    </Button>
                                </ListGroupItem>
                            {/if}
                        {/each}
                    {:else if $state === "town"}
                        Just chilling...
                    {:else if $state === "narration"}
                        {#each narrationFilelist as item, i}
                            {#if !toIgnore.includes(item.name)}
                                <ListGroupItem style="border:none">
                                    <Button
                                        bind:inner={buttons[
                                            (i + 1) % narrationFilelist.length
                                        ]}
                                        on:click={() => {
                                            dispatch("key_press", "click");
                                            dispatch(
                                                "play_narration",
                                                item.name
                                            );
                                        }}
                                    >
                                        {item.name}
                                    </Button>
                                </ListGroupItem>
                            {/if}
                        {/each}
                        <Button
                            on:click={() => {
                                dispatch("key_press", "click");
                                $state = "battle";
                            }}>Go Back</Button
                        >
                    {/if}
                {/if}
                {#if $state != "narration"}
                    <ListGroupItem style="border:none">
                        <Button
                            on:click={() => {
                                if ($state === "town") $state = "battle";
                                else if ($state === "battle") {
                                    $state = "town";
                                    dispatch("key_press", "click");
                                    dispatch("play_message", "town");
                                }
                            }}
                        >
                            {$state === "town" ? "To Battle!" : "Back to town"}
                        </Button>
                    </ListGroupItem>
                {/if}
            </ListGroup>
        </div>
        <div class="col-4">
            {#if $state === "battle"}
                <Button
                    class="btn-success"
                    on:click={() => {
                        dispatch("play_message", "victory");
                        dispatch("key_press", "click");
                    }}>Victory</Button
                >
            {/if}
        </div>
        <!--TODO: Add a button to play the narration, and make it pretty-->
    </div>
</main>

<svelte:window on:keydown|preventDefault={onKeyDown} />

<style>
</style>
