<script lang="ts">
    import Button, { buttonVariants } from '#lib/components/ui/button/button.svelte';
    import * as Dialog from "#lib/components/ui/dialog/index.js";
    import * as Select from "#lib/components/ui/select/index.js";
    import * as Field from "#lib/components/ui/field/index.js";
    import { Input } from "#lib/components/ui/input/index.js";
	import { Label } from "#lib/components/ui/label/index.js";
    import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
    import * as Popover from '#lib/components/ui/popover/index.ts';
    import * as Table from '#lib/components/ui/table/index.ts';
    import {UserRoundPlusIcon, EllipsisIcon, PencilIcon, TrashIcon, RotateCcwIcon, CalendarIcon} from '@lucide/svelte/icons';    
    import { Spinner } from '#lib/components/ui/spinner/index.js';
    import { toast } from 'svelte-sonner';
    import { getApiErrorMessage } from '#lib/helpers/client/getApiErrorMessage.ts';
    import { axiosA } from '#lib/adapters/Axios.adapter.js';
    import { Separator } from '#lib/components/ui/separator/index.js';
      import {
        type DateValue,
        DateFormatter,
        getLocalTimeZone,
          parseDate,
          today,
      } from "@internationalized/date";
    import { cn } from 'cn';
    import { Calendar } from '#lib/components/ui/calendar/index.js';

    const {data} = $props();

    let loadingType = $state<"submit" | "delete" | null>(null);

    type Departamento = NonNullable<typeof data.dependencias>[number];
    let dptos = $state(data.dependencias ?? []);    

    let isDialogDependenciaAbierto = $state(false);
    let isDialogDelDependenciaAbierto = $state(false);
    const df = new DateFormatter("es-VE", {
        dateStyle: "long",
    });

    let iSeleccionado = $state<number | null>(null);
    let formulario = $state<{
        nombre: string;
    }>({
        nombre: ''
    });

    const abrirRegistro = () => {
        iSeleccionado = null;
        formulario = {
            nombre: ''
        };
        isDialogDependenciaAbierto = true;
    }

    const abrirEdicion = (departamento: Departamento, i:number) => {
        iSeleccionado = i;
        formulario = {
            nombre: departamento.nombre
        };
        isDialogDependenciaAbierto = true;
    }

    const abrirEliminacion = (i:number) => {
        iSeleccionado = i;
        isDialogDelDependenciaAbierto = true;
    }

    const registrarDepartamento = async () => {
        loadingType = "submit";
        try {
            const payload = {
                ...formulario
            };

            if(iSeleccionado === null){
                
                const res = await axiosA.post('/areas', payload);

                if(res.status === 201){
                    toast.success('Departamento registrado con éxito');
                    dptos = [...dptos, {...res.data}];
                    isDialogDependenciaAbierto = false;
                } else {
                    toast.error('Error al registrar el departamento');
                }

            } else {
                const res = await axiosA.put(`/areas/${dptos[iSeleccionado].id}`, payload);

                if(res.status === 200){
                    toast.success('Departamento modificado con éxito');
                    dptos[iSeleccionado] = {
                        ...dptos[iSeleccionado],
                        ...res.data
                    };
                    isDialogDependenciaAbierto = false;
                } else {
                    toast.error('Error al modificar el departamento');
                }
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error))
        } finally {
            loadingType = null;
            
        }
    }

    const eliminarDepartamento = async () => {
        loadingType = "delete";
        try {
            const res = await axiosA.delete(`/areas/${dptos[iSeleccionado!].id}`);

            if(res.status === 200){
                toast.success('Departamento eliminado con éxito');
                dptos = dptos.filter((_,i) => i !== iSeleccionado);
            } else {
                toast.error('Error al eliminar el departamento');
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error))
        } finally {
            loadingType = null;
            isDialogDelDependenciaAbierto = false;
        }
    }

</script>



<div class="w-full min-h-screen flex flex-col items-center mt-4 space-y-4">
    <h1 class="text-2xl font-bold mb-4">Departamentos Registrados</h1>
     
    {@render DialogDependencia()}
    {@render DialogDeleteDependencia()}
    
    <div>
        <Table.Root>
            <Table.Header>
                <Table.Row>
                <Table.Head class="w-25">Departamento</Table.Head>
                <Table.Head class="text-end">Acciones</Table.Head>
                </Table.Row>
            </Table.Header>
            <Table.Body>
            {#each dptos as dpto, index (dpto.id)}
                <Table.Row>
                <Table.Cell class="font-medium">{dpto.nombre}</Table.Cell>
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
							<DropdownMenu.Item onclick={() => abrirEdicion(dpto, index)}> <PencilIcon class="size-4" /> Editar</DropdownMenu.Item>
							<DropdownMenu.Separator/>
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


{#snippet DialogDependencia()}
    <Button type="button" onclick={abrirRegistro}>
        <UserRoundPlusIcon class="size-4"/> Registrar Dependencia
    </Button>
    <Dialog.Root bind:open={isDialogDependenciaAbierto}>
    
            <Dialog.Content class="sm:max-w-sm">
                <Dialog.Header>
                    <Dialog.Title>{iSeleccionado === null ? "Registrar Dependencia" : "Editar Dependencia"}</Dialog.Title>
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
                        <Label for="nombre">Nombre</Label>
                        <Input id="nombre" name="nombre" bind:value={formulario.nombre} />
                    </Field.Field>                   
                </Field.Group>
                <Dialog.Footer class="mt-4">
                    <Dialog.Close type="button" class={buttonVariants({ variant: "outline" })}>
                        Cancelar
                    </Dialog.Close>
                    <Button type="button" onclick={registrarDepartamento}>
                        {iSeleccionado === null ? "Registrar" : "Guardar cambios"}
                    </Button>
                </Dialog.Footer>
                </form>
                {/if}
            </Dialog.Content>
    </Dialog.Root>
{/snippet}


{#snippet DialogDeleteDependencia()}    
    <Dialog.Root bind:open={isDialogDelDependenciaAbierto}>
    
            <Dialog.Content class="sm:max-w-sm">
                <Dialog.Header>
                    <Dialog.Title>Eliminar Dependencia</Dialog.Title>
                </Dialog.Header>
                {#if loadingType === "delete"}
                    <div class="flex flex-col items-center justify-center gap-4">
                        <Spinner class="size-8" />
                        <p class="text-sm text-muted-foreground">Eliminando...</p>
                    </div>
                {:else}
                <div>
                    Esta seguro de querer eliminar el registro del departamento {dptos[iSeleccionado!]?.nombre}? Esta acción no se puede deshacer.
                </div>
                <Dialog.Footer class="mt-4">
                    <Dialog.Close type="button" class={buttonVariants({ variant: "outline" })}>
                        Cancelar
                    </Dialog.Close>
                    <Button type="button" variant="destructive" onclick={eliminarDepartamento}>
                        Eliminar
                    </Button>
                </Dialog.Footer>
                {/if}
            </Dialog.Content>
    </Dialog.Root>
{/snippet}


