<script lang="ts">
	import { Button } from '$lib/components/ui/button/index';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index';
	import { Toaster } from '$lib/components/ui/sonner';
	import Moon from 'lucide-svelte/icons/moon';
	import Sun from 'lucide-svelte/icons/sun';
	import Menu from 'lucide-svelte/icons/menu';
	import { ModeWatcher } from 'mode-watcher';
	import '../app.css';
	import { page } from '$app/stores';
	import { base } from '$app/paths';

	import { resetMode, setMode } from 'mode-watcher';

	let routes: Record<string, string> = {};
	routes[`${base}/`] = 'Home';
	routes[`${base}/merge-convert/`] = 'Merge/Convert to PDF';
	routes[`${base}/decrypt/`] = 'Decrypt PDF';

	let innerWidth: number;
	let innerHeight: number;

	$: smallScreen = innerWidth < 640;
	$: largeScreen = innerWidth >= 640;
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<ModeWatcher />

<nav class="flex justify-between">
	{#if largeScreen}
		<ul class="inline-flex space-x-4 items-center ml-8">
			{#each Object.entries(routes) as [route, name]}
				{#if $page.url.pathname == route}
					<li
						class="flex text-center bg-background text-foreground text-xl font-semibold px-4 w-fit border-b-2 border-foreground h-12 items-center"
					>
						<a href={route}>{name}</a>
					</li>
				{:else}
					<li
						class="flex text-center bg-background text-foreground text-xl font-semibold px-4 w-fit h-12 items-center"
					>
						<a href={route}>{name}</a>
					</li>
				{/if}
			{/each}
		</ul>
	{:else}
		<nav class="h-12">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger><Menu class="h-8 w-8 my-2 mx-4" /></DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Group>
						<DropdownMenu.Label>Pages</DropdownMenu.Label>
						<DropdownMenu.Separator />
						{#each Object.entries(routes) as [route, name]}
							<a href={route}
								><DropdownMenu.Item class="cursor-pointer">{name}</DropdownMenu.Item></a
							>
						{/each}
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</nav>
	{/if}
	<div class="inline-flex items-center mr-2">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild let:builder>
				<Button builders={[builder]} variant="outline" size="icon">
					<Sun
						class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
					/>
					<Moon
						class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
					/>
					<span class="sr-only">Toggle theme</span>
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end">
				<DropdownMenu.Item on:click={() => setMode('light')}>Light</DropdownMenu.Item>
				<DropdownMenu.Item on:click={() => setMode('dark')}>Dark</DropdownMenu.Item>
				<DropdownMenu.Item on:click={() => resetMode()}>System</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
</nav>
<hr />

<Toaster richColors closeButton />

<slot />
