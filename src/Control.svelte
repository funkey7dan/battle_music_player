<script>
    import { Button, Container } from "sveltestrap";
    const ipc = require("electron").ipcRenderer;
    import { createEventDispatcher } from "svelte";
    import { filelist_store } from "./stores";
    const dispatch = createEventDispatcher();
    var filelist;
    filelist_store.subscribe((value) => (filelist = value));
    ipc.send("request_files");
    ipc.on("music_files", function (event, arg) {
        console.log(event);
        filelist = arg;
        console.log("ipc got " + arg);
    });

    ipc.on("file_path", function (event, arg) {});
</script>

<main>
    <ul>
        {#if filelist}
            <!-- content here -->
            {#each filelist as item}
                <li>
                    <Button
                        on:click={() => dispatch("play_message", item.name)}
                    >
                        {item.name}
                    </Button>
                </li>
            {/each}
        {/if}
    </ul>
</main>

<style>
    /* your styles go here */
    ul {
        list-style: none;
    }
    li {
        margin-bottom: 0.5rem;
    }
</style>
