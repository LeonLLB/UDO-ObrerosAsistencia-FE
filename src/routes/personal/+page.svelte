<script lang="ts">
    import Button, { buttonVariants } from '#lib/components/ui/button/button.svelte';
    import * as Card from '#lib/components/ui/card/index.ts';
    import * as Dialog from "#lib/components/ui/dialog/index.js";
    import * as Select from "#lib/components/ui/select/index.js";
    import * as Field from "#lib/components/ui/field/index.js";
    import { Input } from "#lib/components/ui/input/index.js";
	import { Label } from "#lib/components/ui/label/index.js";
    import * as Popover from '#lib/components/ui/popover/index.ts';
    import * as Table from '#lib/components/ui/table/index.ts';
    import {UserRoundPlusIcon, PencilIcon, TrashIcon, RotateCcwIcon, CalendarIcon} from '@lucide/svelte/icons';    
    import { Spinner } from '#lib/components/ui/spinner/index.js';
    import { toast } from 'svelte-sonner';
    import { getApiErrorMessage } from '#lib/helpers/client/getApiErrorMessage.ts';
    import { axiosA } from '#lib/adapters/Axios.adapter.js';
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
        { value: 'A', label: 'Administrativo' },
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
    let gruposCuenta = $state<string[]>(['', '', '', '', '']);
    let formulario = $state<{
        cedula: string;
        nCuenta: string;
        nombres: string;
        apellidos: string;
        idAreaEncargada: string;
        tipo: string;
        fechaIngreso: DateValue;
    }>({
        cedula: '',
        nCuenta: '',
        nombres: '',
        apellidos: '',
        idAreaEncargada:'',
        tipo: "O",
        fechaIngreso: today(getLocalTimeZone())
    });

    const abrirRegistro = () => {
        iSeleccionado = null;
        gruposCuenta = ['', '', '', '', ''];
        formulario = {
            cedula: '',
            nCuenta: '',
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
        const cuenta = trabajador.nCuenta ?? '';
        gruposCuenta = Array.from({ length: 5 }, (_, index) => cuenta.slice(index * 4, index * 4 + 4));
        formulario = {
            cedula: trabajador.cedula,
            nCuenta: trabajador.nCuenta ?? '',
            nombres: trabajador.nombres,
            apellidos: trabajador.apellidos,
            idAreaEncargada: (trabajador.areaEncargada?.id || '') + '',
            tipo: trabajador.tipo,
            fechaIngreso: parseDate(trabajador.fechaIngreso)
        };
        isDialogTrabajadorAbierto = true;
    }

    function enfocarGrupoCuenta(index: number) {
        const input = document.getElementById(`cuenta-${index}`);
        if (input instanceof HTMLInputElement) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }
    }

    function cambiarGrupoCuenta(index: number, event: Event) {
        const input = event.currentTarget;
        if (!(input instanceof HTMLInputElement)) return;
        const digits = input.value.replace(/\D/g, '').slice(0, 4);
        input.value = digits;
        gruposCuenta[index] = digits;
        if (digits.length === 4 && index < 4) enfocarGrupoCuenta(index + 1);
    }

    function pegarCuenta(index: number, event: ClipboardEvent) {
        const text = event.clipboardData?.getData('text') ?? '';
        const digits = text.replace(/\D/g, '');
        event.preventDefault();
        if (!digits) return;
        const start = digits.length >= 20 ? 0 : index;
        const available = digits.slice(0, (5 - start) * 4);
        for (let offset = 0; offset < available.length; offset += 4) {
            gruposCuenta[start + offset / 4] = available.slice(offset, offset + 4);
        }
        enfocarGrupoCuenta(Math.min(start + Math.floor(available.length / 4), 4));
    }

    function navegarCuenta(index: number, event: KeyboardEvent) {
        const input = event.currentTarget;
        if (!(input instanceof HTMLInputElement)) return;
        if ((event.key === 'Backspace' || event.key === 'ArrowLeft') && input.selectionStart === 0 && input.selectionEnd === 0 && index > 0) {
            event.preventDefault();
            enfocarGrupoCuenta(index - 1);
        } else if (event.key === 'ArrowRight' && input.selectionStart === input.value.length && input.selectionEnd === input.value.length && index < 4) {
            event.preventDefault();
            enfocarGrupoCuenta(index + 1);
        }
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
        const nCuenta = gruposCuenta.join('');
        if (gruposCuenta.some((grupo) => !/^\d{4}$/.test(grupo))) {
            toast.error('El número de cuenta debe contener exactamente 20 dígitos.');
            return;
        }
        if (!formulario.idAreaEncargada) {
            toast.error('Selecciona una dependencia.');
            return;
        }
        loadingType = "submit";
        try {
            const payload = {
                ...formulario,
                nCuenta,
                idAreaEncargada: formulario.idAreaEncargada === '' ? null : parseInt(formulario.idAreaEncargada),   
                fechaIngreso: formulario.fechaIngreso.toString()
            };

            if(iSeleccionado === null){
                
                const res = await axiosA.post('/personal', payload);

                if(res.status === 201){
                    toast.success('trabajador registrado con éxito');
                    personal = [...personal, {...res.data,status:1}];
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



<main class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-screen-2xl flex-col gap-6 px-4 py-8">
    <div class="flex flex-wrap items-center justify-between gap-4">
        <h1 class="text-2xl font-bold">Trabajadores registrados</h1>
        <Button type="button" onclick={abrirRegistro}>
            <UserRoundPlusIcon class="size-4"/> Registrar trabajador
        </Button>
    </div>

    {@render DialogTrabajador()}
    {@render DialogLoadingToggle()}
     {@render DialogDeleteTrabajador()}
    
    <Card.Root>
    <Card.Content class="p-4 sm:p-6">
    {#if personal.length === 0}
        <p class="py-8 text-center text-muted-foreground">No hay trabajadores registrados.</p>
    {:else}
    <div class="overflow-x-auto">
        <Table.Root>
            <Table.Header>
                <Table.Row>
                <Table.Head class="w-25">Cédula</Table.Head>
                <Table.Head>Nombres y Apellidos</Table.Head>
                <Table.Head>Número de cuenta</Table.Head>
                <Table.Head>Tipo</Table.Head>
                <Table.Head>Dependencia Asignada</Table.Head>
                <Table.Head>Status Captahuella</Table.Head>
                <Table.Head class="text-end">Acciones</Table.Head>
                </Table.Row>
            </Table.Header>
            <Table.Body>
            {#each personal as trabajador, index (trabajador.id)}
                <Table.Row>
                <Table.Cell class="font-medium">
                    <a class="text-primary underline-offset-4 hover:underline" href={`/personal/${encodeURIComponent(trabajador.cedula)}`}>
                        {trabajador.cedula}
                    </a>
                </Table.Cell>
                <Table.Cell>
                    <a class="text-primary underline-offset-4 hover:underline" href={`/personal/${encodeURIComponent(trabajador.cedula)}`}>
                        {trabajador.nombres} {trabajador.apellidos}
                    </a>
                </Table.Cell>
                <Table.Cell>
                    {#if trabajador.nCuenta}
                        {trabajador.nCuenta}
                    {:else}
                        <span class="text-amber-700 dark:text-amber-400">Sin registrar</span>
                    {/if}
                </Table.Cell>
                <Table.Cell>{trabajador.tipo === "A" ? "Administrativo" : "Obrero"}</Table.Cell>
                <Table.Cell class="font-medium text-center">{!(trabajador.areaEncargada?.id) ? "NO ASIGNADA" : trabajador.areaEncargada.nombre }</Table.Cell>
                <Table.Cell class="font-medium text-center">{trabajador.status === 0 ? "Inactivo" : "Activo"}</Table.Cell>
                <Table.Cell class="text-right">
                    <div class="flex justify-end gap-2">
                        <Button variant="outline" size="icon" aria-label="Editar trabajador" title="Editar trabajador" onclick={() => abrirEdicion(trabajador, index)}>
                            <PencilIcon class="size-4" />
                        </Button>
                        <Button variant="outline" size="icon" aria-label={trabajador.status === 0 ? 'Activar huella' : 'Desactivar huella'} title={trabajador.status === 0 ? 'Activar huella' : 'Desactivar huella'} onclick={() => abrirEliminacionOToggle(index, true)}>
                            <RotateCcwIcon class="size-4" />
                        </Button>
                        <Button variant="destructive" size="icon" aria-label="Eliminar trabajador" title="Eliminar trabajador" onclick={() => abrirEliminacionOToggle(index)}>
                            <TrashIcon class="size-4" />
                        </Button>
                    </div>
				</Table.Cell>
                </Table.Row>
            {/each}
            </Table.Body>
        </Table.Root>
    </div>
    {/if}
    </Card.Content>
    </Card.Root>
</main>


{#snippet DialogTrabajador()}
    <Dialog.Root bind:open={isDialogTrabajadorAbierto}>
    
            <Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <Dialog.Header>
                    <Dialog.Title>{iSeleccionado === null ? "Registrar Trabajador" : "Editar Trabajador"}</Dialog.Title>
                </Dialog.Header>
                {#if loadingType === "submit"}
                    <div class="flex flex-col items-center justify-center gap-4">
                        <Spinner class="size-8" />
                        <p class="text-sm text-muted-foreground">Procesando...</p>
                    </div>
                {:else}
                <form onsubmit={(event) => { event.preventDefault(); void registrarTrabajador(); }}>
                
                <Field.Group class="mt-4">
                    <Field.Field>
                        <Label for="cedula">Cédula</Label>
                        <Input disabled={iSeleccionado !== null} id="cedula" name="cedula" bind:value={formulario.cedula} required maxlength={20} />
                        <Field.Description>{iSeleccionado !== null ? "No es posible editar la cédula de un trabajador ya registrado" : ""}</Field.Description>
                    </Field.Field>
                    <Field.Field>
                        <Label for="cuenta-0">Número de cuenta</Label>
                        <div class="grid grid-cols-5 gap-2" role="group" aria-label="Número de cuenta" aria-describedby="cuenta-ayuda">
                            {#each gruposCuenta as grupo, index (index)}
                                <Input
                                    id={`cuenta-${index}`}
                                    aria-label={`Número de cuenta, grupo ${index + 1} de 5`}
                                    type="text"
                                    inputmode="numeric"
                                    autocomplete="off"
                                    pattern={'[0-9]{4}'}
                                    minlength={4}
                                    maxlength={4}
                                    value={grupo}
                                    oninput={(event) => cambiarGrupoCuenta(index, event)}
                                    onpaste={(event) => pegarCuenta(index, event)}
                                    onkeydown={(event) => navegarCuenta(index, event)}
                                    class="px-1 text-center"
                                    required
                                />
                            {/each}
                        </div>
                        </Field.Field>
                    <Field.Field>
                        <Label for="nombres">Nombres</Label>
                        <Input id="nombres" name="nombres" bind:value={formulario.nombres} required maxlength={100} />
                    </Field.Field>
                    <Field.Field>
                        <Label for="apellidos">Apellidos</Label>
                        <Input id="apellidos" name="apellidos" bind:value={formulario.apellidos} required maxlength={100} />
                    </Field.Field>
                    <Field.Field>
                        <Label for="tipo">Tipo de Personal</Label>
                        <Select.Root name="tipo" bind:value={formulario.tipo} type="single" items={tiposPersonal} >
                            <Select.Trigger id="tipo" class="w-full">
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
                            <Select.Trigger id="dependencia" class="w-full">
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
                                "w-full justify-start text-start font-normal",
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
                    <Button type="submit">
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
                    <Dialog.Title>Eliminar trabajador</Dialog.Title>
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
