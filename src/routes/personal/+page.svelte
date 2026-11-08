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

    let loadingType = $state<"submit" | "delete" | "huella" | null>(null);

    type Trabajador = NonNullable<typeof data.personal>[number];
    let personal = $state(data.personal ?? []);
    const tiposPersonal = [
        { value: 'A', label: 'Adminitrativo' },
        { value: 'O', label: 'Obrero' }
    ];

    const tipoDependencias = data.dependencias?.map(dpto => ({
        value: String(dpto.id),
        label: dpto.nombre
    })) ?? [];

    let isDialogTrabajadorAbierto = $state(false);
    let isDialogDelTrabajadorAbierto = $state(false);
    let isDialogToggleTrabajadorAbierto = $state(false);

    const df = new DateFormatter("es-VE", {
        dateStyle: "long",
    });

    let iSeleccionado = $state<number | null>(null);
    let formulario = $state<{
        cedula: string;
        nombres: string;
        apellidos: string;
        idAreaEncargada: string;
        tipo: string;
        fechaIngreso: DateValue;
    }>({
        cedula: '',
        nombres: '',
        apellidos: '',
        idAreaEncargada:'',
        tipo: "O",
        fechaIngreso: today(getLocalTimeZone())
    });

    const abrirRegistro = () => {
        iSeleccionado = null;
        formulario = {
            cedula: '',
            nombres: '',
            apellidos: '',
            idAreaEncargada: '',
            tipo: "O",
            fechaIngreso: today(getLocalTimeZone())
        };
        isDialogTrabajadorAbierto = true;
    }

    const abrirEdicion = (trabajador: Trabajador, i:number) => {
        iSeleccionado = i;
        formulario = {
            cedula: trabajador.cedula,
            nombres: trabajador.nombres,
            apellidos: trabajador.apellidos,
            idAreaEncargada: (trabajador.areaEncargada?.id || '') + '',
            tipo: trabajador.tipo,
            fechaIngreso: parseDate(trabajador.fechaIngreso)
        };
        isDialogTrabajadorAbierto = true;
    }
    const abrirEliminacionOToggle = (i:number,isToggle = false) => {
        iSeleccionado = i;        
        if(isToggle){
            isDialogToggleTrabajadorAbierto = true
            toggleHuella()
        } else {
            isDialogDelTrabajadorAbierto = true;
        }
    }

    const registrarTrabajador = async () => {
        loadingType = "submit";
        try {
            const payload = {
                ...formulario,
                idAreaEncargada: formulario.idAreaEncargada === '' ? null : parseInt(formulario.idAreaEncargada),   
                fechaIngreso: formulario.fechaIngreso.toString()
            };

            if(iSeleccionado === null){
                
                const res = await axiosA.post('/personal', payload);

                if(res.status === 201){
                    toast.success('trabajador registrado con éxito');
                    personal = [...data.personal ?? [], {...res.data,status:1}];
                    isDialogTrabajadorAbierto = false;
                } else {
                    toast.error('Error al registrar el trabajador');
                }

            } else {
                const res = await axiosA.put(`/personal/${personal[iSeleccionado].id}`, payload);

                if(res.status === 200){
                    toast.success('trabajador modificado con éxito');
                    personal[iSeleccionado] = {
                        ...personal[iSeleccionado],
                        ...res.data
                    };
                    isDialogTrabajadorAbierto = false;
                } else {
                    toast.error('Error al modificar el trabajador');
                }
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error))
        } finally {
            loadingType = null;
            
        }
    }

    const eliminarTrabajador = async () => {
        loadingType = "delete";
        try {
            const res = await axiosA.delete(`/personal/${personal[iSeleccionado!].id}`);

            if(res.status === 200){
                toast.success('Trabajador eliminado con éxito');
                personal = personal.filter((_,i) => i !== iSeleccionado);
            } else {
                toast.error('Error al eliminar el trabajador');
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error))
        } finally {
            loadingType = null;
            isDialogDelTrabajadorAbierto = false;
        }
    }

    const toggleHuella = async () => {
        loadingType = "huella";
        try {
            const res = await axiosA.put(`/personal/${personal[iSeleccionado!].id}/toggle-status`);

            if(res.status === 200){
                toast.success(`Status del trabajador actualizado con éxito, captahuella ${res.data.status === 1 ? "activada" : "desactivada"}`);
                 personal[iSeleccionado!] = {
                        ...personal[iSeleccionado!],
                        status:res.data.status
                    }
            } else {
                toast.error('Error al cambiar el status de la huella trabajador');
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error))
        } finally {
            loadingType = null;
            isDialogToggleTrabajadorAbierto = false;
        }
    }

</script>



<div class="w-full min-h-screen flex flex-col items-center mt-4 space-y-4">
    <h1 class="text-2xl font-bold mb-4">Visualizar Trabajadores Registrados</h1>
     
    {@render DialogTrabajador()}
    {@render DialogLoadingToggle()}
     {@render DialogDeleteTrabajador()}
    
    <div>
        <Table.Root>
            <Table.Header>
                <Table.Row>
                <Table.Head class="w-25">Cédula</Table.Head>
                <Table.Head>Nombres y Apellidos</Table.Head>
                <Table.Head>Tipo</Table.Head>
                <Table.Head>Dependencia Asignada</Table.Head>
                <Table.Head>Status Captahuella</Table.Head>
                <Table.Head class="text-end">Acciones</Table.Head>
                </Table.Row>
            </Table.Header>
            <Table.Body>
            {#each personal as trabajador, index (trabajador.id)}
                <Table.Row>
                <Table.Cell class="font-medium">{trabajador.cedula}</Table.Cell>
                <Table.Cell>{trabajador.nombres} {trabajador.apellidos}</Table.Cell>
                <Table.Cell>{trabajador.tipo === "A" ? "Administrativo" : "Obrero"}</Table.Cell>
                <Table.Cell class="font-medium text-center">{!(trabajador.areaEncargada?.id) ? "NO ASIGNADA" : trabajador.areaEncargada.nombre }</Table.Cell>
                <Table.Cell class="font-medium text-center">{trabajador.status === 0 ? "Inactivo" : "Activo"}</Table.Cell>
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
							<DropdownMenu.Item onclick={() => abrirEdicion(trabajador, index)}> <PencilIcon class="size-4" /> Editar</DropdownMenu.Item>
							<DropdownMenu.Item onclick={() => abrirEliminacionOToggle(index, true)}> <RotateCcwIcon class="size-4" /> {trabajador.status === 0 ? "Activar Huella" : "Desactivar Huella" }</DropdownMenu.Item>
                            <DropdownMenu.Separator/>
							<DropdownMenu.Item variant="destructive" onclick={() => abrirEliminacionOToggle(index)}> <TrashIcon class="size-4" /> Eliminar</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</Table.Cell>
                </Table.Row>
            {/each}
            </Table.Body>
        </Table.Root>
    </div>
</div>


{#snippet DialogTrabajador()}
    <Button type="button" onclick={abrirRegistro}>
        <UserRoundPlusIcon class="size-4"/> Registrar Trabajador
    </Button>
    <Dialog.Root bind:open={isDialogTrabajadorAbierto}>
    
            <Dialog.Content class="sm:max-w-sm">
                <Dialog.Header>
                    <Dialog.Title>{iSeleccionado === null ? "Registrar Trabajador" : "Editar Trabajador"}</Dialog.Title>
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
                        <Input disabled={iSeleccionado !== null} id="cedula" name="cedula" bind:value={formulario.cedula} />
                        <Field.Description>{iSeleccionado !== null ? "No es posible editar la cédula de un trabajador ya registrado" : ""}</Field.Description>
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
                        <Label for="tipo">Tipo de Personal</Label>
                        <Select.Root name="tipo" bind:value={formulario.tipo} type="single" items={tiposPersonal} >
                            <Select.Trigger class="w-25">
                                <Select.Value placeholder="Tipo de Personal" />
                            </Select.Trigger>
                            <Select.Content>
                                {#each tiposPersonal as tipo}
                                    <Select.Item value={tipo.value} label={tipo.label} />
                                {/each}
                            </Select.Content>
                        </Select.Root>                        
                    </Field.Field>
                    <Field.Field>
                        <Label for="dependencia">Dependencia Asignada</Label>
                        <Select.Root name="dependencia" bind:value={formulario.idAreaEncargada} type="single" items={tipoDependencias} >
                            <Select.Trigger class="w-25">
                                <Select.Value placeholder="Dependencia Asignada" />
                            </Select.Trigger>
                            <Select.Content>
                                {#each tipoDependencias as dpto}
                                    <Select.Item value={dpto.value} label={dpto.label} />
                                {/each}
                            </Select.Content>
                        </Select.Root>                        
                    </Field.Field>
                    <Field.Field>
                        <Label for="fechaIngreso">Fecha de Ingreso</Label>
                        <Popover.Root>
                        <Popover.Trigger>
                            {#snippet child({ props })}
                            <Button
                                variant="outline"
                                class={cn(
                                "w-70 justify-start text-start font-normal",
                                !formulario.fechaIngreso && "text-muted-foreground"
                                )}
                                {...props}
                            >
                                <CalendarIcon class="me-2 size-4" />
                                {df.format(formulario.fechaIngreso.toDate(getLocalTimeZone()))}
                            </Button>
                            {/snippet}
                        </Popover.Trigger>
                        <Popover.Content class="w-auto p-0">
                            <Calendar bind:value={formulario.fechaIngreso} type="single" initialFocus captionLayout="dropdown" />
                        </Popover.Content>
                        </Popover.Root>
                                              
                    </Field.Field>
                </Field.Group>
                <Dialog.Footer class="mt-4">
                    <Dialog.Close type="button" class={buttonVariants({ variant: "outline" })}>
                        Cancelar
                    </Dialog.Close>
                    <Button type="button" onclick={registrarTrabajador}>
                        {iSeleccionado === null ? "Registrar" : "Guardar cambios"}
                    </Button>
                </Dialog.Footer>
                </form>
                {/if}
            </Dialog.Content>
    </Dialog.Root>
{/snippet}


{#snippet DialogDeleteTrabajador()}    
    <Dialog.Root bind:open={isDialogDelTrabajadorAbierto}>
    
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
                    Esta seguro de querer eliminar el registro del funcionario {personal[iSeleccionado!]?.nombres} {personal[iSeleccionado!]?.apellidos} con cédula {personal[iSeleccionado!]?.cedula}? Esta acción no se puede deshacer.
                </div>
                <Dialog.Footer class="mt-4">
                    <Dialog.Close type="button" class={buttonVariants({ variant: "outline" })}>
                        Cancelar
                    </Dialog.Close>
                    <Button type="button" variant="destructive" onclick={eliminarTrabajador}>
                        Eliminar
                    </Button>
                </Dialog.Footer>
                {/if}
            </Dialog.Content>
    </Dialog.Root>
{/snippet}

{#snippet DialogLoadingToggle()}    
    <Dialog.Root bind:open={isDialogToggleTrabajadorAbierto}>
    
            <Dialog.Content class="sm:max-w-sm">
                {#if loadingType === "huella"}
                    <div class="flex flex-col items-center justify-center gap-4">
                        <Spinner class="size-8" />
                        <p class="text-sm text-muted-foreground">Cambiando estado de huella...</p>
                    </div> 
                {/if}
            </Dialog.Content>
    </Dialog.Root>
{/snippet}
