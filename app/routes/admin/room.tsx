import {PlusIcon} from '@heroicons/react/24/solid'
import {Button, Modal, NumberInput, TextInput, clsx} from '@mantine/core'
import {useDisclosure} from '@mantine/hooks'
import type {ActionFunction} from '@remix-run/node'
import {json} from '@remix-run/node'
import {useFetcher} from '@remix-run/react'
import {ObjectId} from 'bson'
import * as React from 'react'
import {z} from 'zod'
import {TailwindContainer} from '~/components/TailwindContainer'
import {db} from '~/db.server'
import {useAdminData} from '~/utils/hooks'
import {badRequest} from '~/utils/misc.server'
import type {inferErrors} from '~/utils/validation'
import {validateAction} from '~/utils/validation'

enum MODE {
	edit,
	add,
}

const ManageRoomSchema = z.object({
	roomId: z.string().optional(),
	no: z.string().min(1, 'Name is required'),
	maxCapacity: z.string().transform(Number),
})
interface ActionData {
	success: boolean
	fieldErrors?: inferErrors<typeof ManageRoomSchema>
}

export const action: ActionFunction = async ({request}) => {
	const {fields, fieldErrors} = await validateAction(request, ManageRoomSchema)

	if (fieldErrors) {
		return badRequest<ActionData>({success: false, fieldErrors})
	}

	const {roomId, no, maxCapacity} = fields
	const id = new ObjectId().toString()

	await db.room.upsert({
		where: {
			id: roomId || id,
		},
		update: {
			maxCapacity,
			no,
		},
		create: {
			id,
			maxCapacity,
			no,
		},
	})
	return json({success: true})
}

export default function ManageRooms() {
	const fetcher = useFetcher<ActionData>()
	const {rooms} = useAdminData()

	type _Room = typeof rooms[number]

	const [selectedRoomId, setSelectedRoomId] = React.useState<
		_Room['id'] | null
	>(null)
	const [selectedRoom, setSelectedRoom] = React.useState<_Room | null>(null)
	const [mode, setMode] = React.useState<MODE>(MODE.edit)
	const [isModalOpen, handleModal] = useDisclosure(false)

	const isSubmitting = fetcher.state !== 'idle'

	React.useEffect(() => {
		if (fetcher.state !== 'idle' && fetcher.submission === undefined) {
			return
		}

		if (fetcher.data?.success) {
			setSelectedRoomId(null)
			handleModal.close()
		}
		// handleModal is not meemoized, so we don't need to add it to the dependency array
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fetcher.data?.success, fetcher.state, fetcher.submission])

	React.useEffect(() => {
		if (!selectedRoomId) {
			setSelectedRoom(null)
			return
		}

		const room = rooms.find(room => room.id === selectedRoomId)
		if (!room) return

		setSelectedRoom(room)
		handleModal.open()
		// handleModal is not meemoized, so we don't need to add it to the dependency array
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rooms, selectedRoomId])

	return (
		<>
			<TailwindContainer className="rounded-md bg-white">
				<div className="mt-8 px-4 py-10 sm:px-6 lg:px-8">
					<div className="sm:flex sm:flex-auto sm:items-center sm:justify-between">
						<div>
							<h1 className="text-3xl font-semibold text-gray-900">Rooms</h1>
						</div>
						<div>
							<Button
								loading={isSubmitting}
								loaderPosition="left"
								onClick={() => {
									setMode(MODE.add)
									handleModal.open()
								}}
							>
								<PlusIcon className="h-4 w-4" />
								<span className="ml-2">Add</span>
							</Button>
						</div>
					</div>
					<div className="mt-8 flex flex-col">
						<div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
							<div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
								<table className="min-w-full divide-y divide-gray-300">
									<thead>
										<tr>
											<th
												scope="col"
												className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
											>
												Name
											</th>

											<th
												scope="col"
												className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
											>
												Max Capacity
											</th>

											<th
												scope="col"
												className="relative py-3.5 pl-3 pr-4 sm:pr-6 md:pr-0"
											></th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200">
										{rooms.map(room => (
											<tr key={room.id}>
												<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
													{room.no}
												</td>
												<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
													{room.maxCapacity}
												</td>
												<td className="relative space-x-4 whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6 md:pr-0">
													<div className="flex items-center gap-6">
														<Button
															loading={isSubmitting}
															variant="subtle"
															loaderPosition="right"
															onClick={() => {
																setSelectedRoomId(room.id)
																setMode(MODE.edit)
															}}
														>
															Edit
														</Button>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			</TailwindContainer>

			<Modal
				opened={isModalOpen}
				onClose={() => {
					setSelectedRoomId(null)
					handleModal.close()
				}}
				title={clsx({
					'Edit room': mode === MODE.edit,
					'Add room': mode === MODE.add,
				})}
				centered
				overlayBlur={1.2}
				overlayOpacity={0.6}
			>
				<fetcher.Form method="post" replace>
					<fieldset disabled={isSubmitting} className="flex flex-col gap-4">
						<input type="hidden" name="roomId" value={selectedRoom?.id} />

						<TextInput
							name="no"
							label="Room No."
							defaultValue={selectedRoom?.no}
							error={fetcher.data?.fieldErrors?.no}
							required
						/>

						<NumberInput
							name="maxCapacity"
							label="Max Capacity"
							defaultValue={selectedRoom?.maxCapacity}
							error={fetcher.data?.fieldErrors?.maxCapacity}
							required
						/>

						<div className="mt-1 flex items-center justify-end gap-4">
							<Button
								variant="subtle"
								disabled={isSubmitting}
								onClick={() => {
									setSelectedRoom(null)
									handleModal.close()
								}}
								color="red"
							>
								Cancel
							</Button>
							<Button
								type="submit"
								loading={isSubmitting}
								loaderPosition="right"
							>
								{mode === MODE.edit ? 'Save changes' : 'Create'}
							</Button>
						</div>
					</fieldset>
				</fetcher.Form>
			</Modal>
		</>
	)
}
