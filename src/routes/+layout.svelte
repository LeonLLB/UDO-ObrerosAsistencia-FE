<script lang="ts">
	import { isAxiosError } from 'axios';
	import { goto } from '$app/navigation';
	import { axiosA } from '#lib/adapters/Axios.adapter.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import MobileSidebar from '#lib/components/navigation/mobile-sidebar.svelte';
	import * as NavigationMenu from '#lib/components/ui/navigation-menu/index.ts';
	import * as Sidebar from '#lib/components/ui/sidebar/index.ts';
	import Toaster from '#lib/components/ui/sonner/sonner.svelte';
	import type { Component } from 'svelte';
	import {LogOutIcon, UsersIcon, ToolboxIcon, BuildingIcon, CalendarDaysIcon,HandCoinsIcon} from '@lucide/svelte/icons';
	import { toast } from 'svelte-sonner';
	import type { LayoutProps } from './$types';

	import './layout.css';

	type NavigationChild = {
		label: string;
		icon: Component<{ class?: string }>;
		url: string;
	};

	type NavigationItem = {
		label: string;
		icon: Component<{ class?: string }>;
		children: NavigationChild[];
	};

	const navigationItems: NavigationItem[] = [
		{label: "Personal", icon: ToolboxIcon, children: [
			{label: "Ver Personal", icon: UsersIcon, url: "/personal"},
			{label: "Ver Dependencias", icon: BuildingIcon, url: "/personal/dependencies"},
			{label: "Asistencia", icon: CalendarDaysIcon, url: "/personal/attendance"},
			{label: "Nomina", icon: HandCoinsIcon, url: "/personal/nomina"},
		]},
	];

	let { children, data }: LayoutProps = $props();
	
	if(data.user?.tipo === "A"){
		navigationItems.push({
			label: 'Usuarios',
			icon: UsersIcon,
			children: [
				{
					label: 'Ver Usuarios',
					icon: UsersIcon,
					url: '/users'
				}
			]
		});
	}

	async function logout() {
		try {
			await axiosA.post('/auth/logout');
		} catch (error) {
			const message = isAxiosError(error)
				? error.response?.data?.message
				: undefined;
			toast.error(
				typeof message === 'string'
					? message
					: 'No se pudo confirmar el cierre de sesión.'
			);
		} finally {
			await goto('/login');
		}
	}
</script>

<svelte:head>
	<title>UDO NM - ADMIN ASISTENCIA DE PERSONAL</title>
</svelte:head>

{#if data.user}
	<Sidebar.Provider class="flex-col">
		<MobileSidebar items={navigationItems} user={data.user} onLogout={logout} />
		<header class="sticky top-0 z-30 w-full bg-background/95 backdrop-blur">
			<div class="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 border-2 rounded-b-3xl px-4 shadow-md">
				<div class="flex items-center gap-2">
					<Sidebar.Trigger class="md:hidden" aria-label="Abrir navegación" />
					<a href="/" class="shrink-0 font-semibold tracking-tight">UDO Asistencia</a>
				</div>

				<nav class="hidden flex-1 justify-center md:flex" aria-label="Navegación principal">
					<NavigationMenu.Root>
						<NavigationMenu.List class="flex items-center gap-1">
							{#each navigationItems as item (item.label)}
								<NavigationMenu.Item>
									<NavigationMenu.Trigger
										class="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									>
										<item.icon class="size-4" />
										{item.label}
									</NavigationMenu.Trigger>
									<NavigationMenu.Content
										class="min-w-56 rounded-md border bg-popover p-2 text-popover-foreground shadow-md"
									>
										<ul class="grid gap-1">
											{#each item.children as link (link.url)}
												<li>
													<NavigationMenu.Link
														href={link.url}
														class="flex items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent"
													>
														<link.icon class="size-4" />
														{link.label}
													</NavigationMenu.Link>
												</li>
											{/each}
										</ul>
									</NavigationMenu.Content>
								</NavigationMenu.Item>
							{/each}
						</NavigationMenu.List>
					</NavigationMenu.Root>
				</nav>

				<div class="hidden items-center gap-3 md:flex">
					<span class="text-sm text-muted-foreground">
						{data.user.nombres} {data.user.apellidos}
					</span>
					<Button variant="outline" onclick={logout}>
						<LogOutIcon class="size-4" />
						Cerrar sesión
					</Button>
				</div>
			</div>
		</header>
		<main>
			{@render children()}
		</main>
	</Sidebar.Provider>
{:else}
	<main>
		{@render children()}
	</main>
{/if}

<Toaster position="top-center" richColors />
