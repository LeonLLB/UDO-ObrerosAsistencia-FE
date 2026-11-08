<script lang="ts">
    import Button, { buttonVariants } from '#lib/components/ui/button/button.svelte';
    import * as Dialog from "#lib/components/ui/dialog/index.js";
    import * as Select from "#lib/components/ui/select/index.js";
    import * as Field from "#lib/components/ui/field/index.js";
    import { Input } from "#lib/components/ui/input/index.js";
	import { Label } from "#lib/components/ui/label/index.js";
    import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
    import * as Table from '#lib/components/ui/table/index.ts';
    import {UserRoundPlusIcon, EllipsisIcon, PencilIcon, TrashIcon} from '@lucide/svelte/icons';    
    import { Spinner } from '#lib/components/ui/spinner/index.js';

    const {data} = $props();

    let loadingType = $state<"submit" | "delete" | null>(null);

    type Usuario = NonNullable<typeof data.users>[number];
    const usuarios = $derived(data.users ?? []);
    const tiposUsuario = [
        { value: 'A', label: 'Administrador' },
        { value: 'C', label: 'Usuario' }
    ];

    let isDialogUsuarioAbierto = $state(false);
    let isDialogDelUsuarioAbierto = $state(false);
    let iSeleccionado = $state<number | null>(null);
    let formulario = $state({
        cedula: '',
        nombres: '',
        apellidos: '',
        tipo: "C"
    });

    const abrirRegistro = () => {
        iSeleccionado = null;
        formulario = { cedula: '', nombres: '', apellidos: '', tipo: "C" };
        isDialogUsuarioAbierto = true;
    }

    const abrirEdicion = (usuario: Usuario, i:number) => {
        iSeleccionado = i;
        formulario = {
            cedula: usuario.cedula,
            nombres: usuario.nombres,
            apellidos: usuario.apellidos,
            tipo: usuario.tipo
        };
        isDialogUsuarioAbierto = true;
    }
    const abrirEliminacion = (i:number) => {
        iSeleccionado = i;        
        isDialogDelUsuarioAbierto = true;
    }

</script>



<div class="w-full min-h-screen flex flex-col items-center mt-4 space-y-4">
    <h1 class="text-2xl font-bold mb-4">Visualizar Usuarios Registrados</h1>
    
    {@render DialogUsuario()}
    {@render DialogDeleteUsuario()}

    <div>
        <Table.Root>
            <Table.Header>
                <Table.Row>
                <Table.Head class="w-25">Cédula</Table.Head>
                <Table.Head>Nombres y Apellidos</Table.Head>
                <Table.Head>Tipo de Usuario</Table.Head>
                <Table.Head class="text-end">Acciones</Table.Head>
                </Table.Row>
            </Table.Header>
            <Table.Body>
            {#each usuarios as user, index (user.id)}
                <Table.Row>
                <Table.Cell class="font-medium">{user.cedula}</Table.Cell>
                <Table.Cell>{user.nombres} {user.apellidos}</Table.Cell>
                <Table.Cell>{user.tipo === "A" ? "Administrador" : "Usuario"}</Table.Cell>
                <Table.Cell class="text-right">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button {...props} variant="ghost" size="icon" class="size-8">
									<EllipsisIcon />
									<span class="sr-only">Abrir menu</span>
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<DropdownMenu.Item onclick={() => abrirEdicion(user, index)}> <PencilIcon class="size-4" /> Editar</DropdownMenu.Item>
							<DropdownMenu.Item variant="destructive" onclick={() => abrirEliminacion(index)}> <TrashIcon class="size-4" /> Eliminar</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</Table.Cell>
                </Table.Row>
            {/each}
            </Table.Body>
        </Table.Root>
    </div>
</div>


{#snippet DialogUsuario()}
    <Button type="button" onclick={abrirRegistro}>
        <UserRoundPlusIcon class="size-4"/> Registrar Usuario
    </Button>
    <Dialog.Root bind:open={isDialogUsuarioAbierto}>
    
            <Dialog.Content class="sm:max-w-sm">
                <Dialog.Header>
                    <Dialog.Title>{iSeleccionado === null ? "Registrar Usuario" : "Editar Usuario"}</Dialog.Title>
                </Dialog.Header>
                {#if loadingType === "submit"}
                    <div class="flex flex-col items-center justify-center gap-4">
                        <Spinner class="size-8" />
                        <p class="text-sm text-muted-foreground">Procesando...</p>
                    </div>
                {:else}
                <form onsubmit={(event) => event.preventDefault()}>
                
                <Field.Group class="mt-4">
                    <Field.Field>
                        <Label for="cedula">Cédula</Label>
                        <Input id="cedula" name="cedula" bind:value={formulario.cedula} />
                    </Field.Field>
                    <Field.Field>
                        <Label for="nombres">Nombres</Label>
                        <Input id="nombres" name="nombres" bind:value={formulario.nombres} />
                    </Field.Field>
                    <Field.Field>
                        <Label for="apellidos">Apellidos</Label>
                        <Input id="apellidos" name="apellidos" bind:value={formulario.apellidos} />
                    </Field.Field>
                    <Field.Field>
                        <Label for="tipo">Tipo de usuario</Label>
                        <Select.Root name="tipo" bind:value={formulario.tipo} type="single" items={tiposUsuario}>
                            <Select.Trigger class="w-25">
                                <Select.Value placeholder="Tipo de usuario" />
                            </Select.Trigger>
                            <Select.Content>
                                {#each tiposUsuario as tipo}
                                    <Select.Item value={tipo.value} label={tipo.label} />
                                {/each}
                            </Select.Content>
                        </Select.Root>
                        
                    </Field.Field>
                </Field.Group>
                <Dialog.Footer class="mt-4">
                    <Dialog.Close type="button" class={buttonVariants({ variant: "outline" })}>
                        Cancelar
                    </Dialog.Close>
                    <Button type="submit">{iSeleccionado === null ? "Registrar" : "Guardar cambios"}</Button>
                </Dialog.Footer>
                </form>
                {/if}
            </Dialog.Content>
    </Dialog.Root>
{/snippet}
{#snippet DialogDeleteUsuario()}    
    <Dialog.Root bind:open={isDialogDelUsuarioAbierto}>
    
            <Dialog.Content class="sm:max-w-sm">
                <Dialog.Header>
                    <Dialog.Title>Eliminar Usuario</Dialog.Title>
                </Dialog.Header>
                {#if loadingType === "delete"}
                    <div class="flex flex-col items-center justify-center gap-4">
                        <Spinner class="size-8" />
                        <p class="text-sm text-muted-foreground">Eliminando...</p>
                    </div>
                {:else}
                <div>
                    Esta seguro de querer eliminar el usuario de {usuarios[iSeleccionado!]?.nombres} {usuarios[iSeleccionado!]?.apellidos} con cédula {usuarios[iSeleccionado!]?.cedula}? Esta acción no se puede deshacer.
                </div>
                <Dialog.Footer class="mt-4">
                    <Dialog.Close type="button" class={buttonVariants({ variant: "outline" })}>
                        Cancelar
                    </Dialog.Close>
                    <Button type="button" variant="destructive">Eliminar</Button>
                </Dialog.Footer>
                {/if}
            </Dialog.Content>
    </Dialog.Root>
{/snippet}