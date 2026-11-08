<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import type { Component } from 'svelte';
	import * as Sidebar from '#lib/components/ui/sidebar/index.ts';

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

	type AuthenticatedUser = {
		nombres: string;
		apellidos: string;
	};

	let {
		items,
		user,
		onLogout
	}: {
		items: NavigationItem[];
		user: AuthenticatedUser;
		onLogout: () => void;
	} = $props();

	const sidebar = Sidebar.useSidebar();
	let expandedGroups = $state<Record<string, boolean>>({});

	function toggleGroup(label: string) {
		expandedGroups[label] = !expandedGroups[label];
	}
</script>

<Sidebar.Root class="md:hidden">
	<Sidebar.Header>
		<span class="px-3 text-base font-semibold">UDO Asistencia</span>
		<span class="px-3 text-sm text-sidebar-foreground/70">
			{user.nombres} {user.apellidos}
		</span>
	</Sidebar.Header>
	<Sidebar.Content>
		{#each items as item (item.label)}
			<Sidebar.Group>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								onclick={() => toggleGroup(item.label)}
								aria-expanded={expandedGroups[item.label] ?? false}
							>
								<item.icon />
								<span>{item.label}</span>
								<ChevronDownIcon
									class={`ml-auto transition-transform duration-200 ${expandedGroups[item.label] ? 'rotate-180' : ''}`}
								/>
							</Sidebar.MenuButton>
							{#if expandedGroups[item.label]}
								<Sidebar.MenuSub>
									{#each item.children as link (link.url)}
										<Sidebar.MenuSubItem>
											<Sidebar.MenuSubButton
												href={link.url}
												onclick={() => sidebar.setOpenMobile(false)}
											>
												<link.icon />
												<span>{link.label}</span>
											</Sidebar.MenuSubButton>
										</Sidebar.MenuSubItem>
									{/each}
								</Sidebar.MenuSub>
							{/if}
						</Sidebar.MenuItem>
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		{/each}
	</Sidebar.Content>
	<Sidebar.Footer>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton onclick={onLogout}>
					<LogOutIcon />
					<span>Cerrar sesión</span>
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
</Sidebar.Root>
