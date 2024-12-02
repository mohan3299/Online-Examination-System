import {InformationCircleIcon, PlusIcon} from '@heroicons/react/24/solid'
import {Alert, Button, Modal, Select, TextInput, clsx} from '@mantine/core'
import {TimeInput} from '@mantine/dates'
import {useDisclosure} from '@mantine/hooks'
import {Day} from '@prisma/client'
import type {ActionFunction} from '@remix-run/node'
import {json} from '@remix-run/node'
import {Form, useFetcher} from '@remix-run/react'
import * as React from 'react'
import {z} from 'zod'
import {TailwindContainer} from '~/components/TailwindContainer'
import {db} from '~/db.server'
import {useAdminData} from '~/utils/hooks'
import {formatTime, setFixedDate} from '~/utils/misc'
import {badRequest} from '~/utils/misc.server'
import type {inferErrors} from '~/utils/validation'
import {validateAction} from '~/utils/validation'

enum MODE {
	edit,
	add,
}

const ManageSectionSchema = z.object({
	sectionId: z.string().optional(),
	name: z.string().min(1, 'Name is required'),
	code: z.string().min(1, 'Code is required'),
	courseId: z.string().min(1, 'Course is required'),
	roomId: z.string().min(1, 'Room is required'),
	facultyId: z.string().min(1, 'Faculty is required'),
	day: z.string().min(1, 'Day is required'),
	startTime: z.string().min(1, 'Start time is required'),
	endTime: z.string().min(1, 'End time is required'),
})
interface ActionData {
	success: boolean
	fieldErrors?: inferErrors<typeof ManageSectionSchema>
}

export const action: ActionFunction = async ({request}) => {
	const {fields, fieldErrors} = await validateAction(
		request,
		ManageSectionSchema
	)

	if (fieldErrors) {
		return badRequest<ActionData>({success: false, fieldErrors})
	}

	const _startTime = setFixedDate(new Date(fields.startTime))
	const _endTime = setFixedDate(new Date(fields.endTime))

	const {sectionId, ...rest} = fields

	if (sectionId) {
		await db.section.update({
			where: {
				id: sectionId,
			},
			data: {
				code: rest.code,
				name: rest.name,
				courseId: rest.courseId,
				roomId: rest.roomId,
				facultyId: rest.facultyId,
				day: rest.day as Day,
				startTime: _startTime,
				endTime: _endTime,
			},
		})

		return json({success: true})
	}

	await db.section.create({
		data: {
			code: rest.code,
			name: rest.name,
			courseId: rest.courseId,
			roomId: rest.roomId,
			facultyId: rest.facultyId,
			day: rest.day as Day,
			startTime: _startTime,
			endTime: _endTime,
		},
	})

	return json({success: true})
}

export default function ManageSections() {
	const fetcher = useFetcher<ActionData>()
	const {sections, courses, faculties, rooms} = useAdminData()

	type _Section = typeof sections[number]

	const [selectedSectionId, setSelectedSectionId] = React.useState<
		_Section['id'] | null
	>(null)
	const [selectedSection, setSelectedSection] = React.useState<_Section | null>(
		null
	)

	const [startTime, setStartTime] = React.useState<Date | null>(null)
	const [endTime, setEndTime] = React.useState<Date | null>(null)
	const [day, setDay] = React.useState<Day | null>(null)
	const [roomId, setRoomId] = React.useState<string | null>(null)
	const [facultyId, setFacultyId] = React.useState<string | null>(null)

	const [mode, setMode] = React.useState<MODE>(MODE.edit)
	const [isModalOpen, handleModal] = useDisclosure(false, {
		onClose: () => {
			setStartTime(null)
			setEndTime(null)
			setDay(null)
			setRoomId(null)
			setFacultyId(null)
			setError(null)
			setDisableSubmit(true)
		},
	})

	const isSubmitting = fetcher.state !== 'idle'

	React.useEffect(() => {
		if (fetcher.state !== 'idle' && fetcher.submission === undefined) {
			return
		}

		if (fetcher.data?.success) {
			setSelectedSectionId(null)
			handleModal.close()
		}
		// handleModal is not meemoized, so we don't need to add it to the dependency array
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fetcher.data?.success, fetcher.state, fetcher.submission])

	React.useEffect(() => {
		if (!selectedSectionId) {
			setSelectedSection(null)
			return
		}

		const course = sections.find(c => c.id === selectedSectionId)
		if (!course) return

		setSelectedSection(course)
		setStartTime(new Date(course.startTime))
		setEndTime(new Date(course.endTime))
		setDay(course.day)
		setRoomId(course.roomId)
		setFacultyId(course.facultyId)

		handleModal.open()
		// handleModal is not meemoized, so we don't need to add it to the dependency array
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sections, selectedSectionId])

	const [error, setError] = React.useState<string | null>(null)
	const [disableSubmit, setDisableSubmit] = React.useState(true)

	React.useEffect(() => {
		if (!startTime || !endTime || !day) {
			setDisableSubmit(true)
			return
		}

		const _startTime = setFixedDate(startTime)
		const _endTime = setFixedDate(endTime)

		if (_startTime.getTime() >= _endTime.getTime()) {
			setError('Start time must be less than end time')
			return
		}

		if (!roomId || !facultyId) {
			return
		}

		const facultySections = sections.filter(
			section =>
				section.facultyId === facultyId && section.id !== selectedSection?.id
		)

		const facultySectionsWithSameDay = facultySections.filter(
			section => section.day === day
		)

		const isFacultyAvailable = facultySectionsWithSameDay.every(section => {
			const sectionStartTime = setFixedDate(new Date(section.startTime))
			const sectionEndTime = setFixedDate(new Date(section.endTime))

			return !(
				(_startTime.getTime() >= sectionStartTime.getTime() &&
					_startTime.getTime() <= sectionEndTime.getTime()) ||
				(_endTime.getTime() >= sectionStartTime.getTime() &&
					_endTime.getTime() <= sectionEndTime.getTime())
			)
		})

		if (!isFacultyAvailable) {
			setError('Faculty is not available at this time')
			return
		}

		const roomSections = sections.filter(
			section => section.roomId === roomId && section.id !== selectedSection?.id
		)

		const roomSectionsWithSameDay = roomSections.filter(
			section => section.day === day
		)

		const isRoomAvailable = roomSectionsWithSameDay.every(section => {
			const sectionStartTime = setFixedDate(new Date(section.startTime))
			const sectionEndTime = setFixedDate(new Date(section.endTime))

			return !(
				(_startTime.getTime() >= sectionStartTime.getTime() &&
					_startTime.getTime() <= sectionEndTime.getTime()) ||
				(_endTime.getTime() >= sectionStartTime.getTime() &&
					_endTime.getTime() <= sectionEndTime.getTime())
			)
		})

		if (!isRoomAvailable) {
			setError('Room is not available at this time')
			return
		}

		setError(null)
		setDisableSubmit(false)
	}, [
		day,
		endTime,
		error,
		facultyId,
		roomId,
		sections,
		startTime,
		selectedSection,
	])

	console.log({
		startTime,
		endTime,
	})

	return (
		<>
			<TailwindContainer className="rounded-md bg-white">
				<div className="mt-8 px-4 py-10 sm:px-6 lg:px-8">
					<div className="sm:flex sm:flex-auto sm:items-center sm:justify-between">
						<div>
							<h1 className="text-3xl font-semibold text-gray-900">Sections</h1>
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
												Code
											</th>

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
												Course
											</th>
											<th
												scope="col"
												className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
											>
												Time
											</th>
											<th
												scope="col"
												className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
											>
												Room
											</th>
											<th
												scope="col"
												className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
											>
												Faculty
											</th>
											<th
												scope="col"
												className="relative py-3.5 pl-3 pr-4 sm:pr-6 md:pr-0"
											></th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200">
										{sections.map(section => (
											<tr key={section.id}>
												<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
													{section.code}
												</td>
												<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
													{section.name}
												</td>
												<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
													{section.course.name}
												</td>
												<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
													<p className="font-bold">{section.day}</p>
													<p>
														{formatTime(section.startTime!)}
														{' - '}
														{formatTime(section.endTime!)}
													</p>
												</td>
												<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
													{section.room.no}
												</td>
												<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
													{section.faculty.name}
												</td>

												<td className="relative space-x-4 whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6 md:pr-0">
													<div className="flex items-center gap-6">
														<Button
															loading={isSubmitting}
															variant="subtle"
															loaderPosition="right"
															onClick={() => {
																setSelectedSectionId(section.id)
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
					setSelectedSectionId(null)
					handleModal.close()
				}}
				title={clsx({
					'Edit section': mode === MODE.edit,
					'Add section': mode === MODE.add,
				})}
				centered
				overlayBlur={1.2}
				overlayOpacity={0.6}
			>
				<Form
					method="post"
					replace
					onSubmit={e => {
						e.preventDefault()
						if (!startTime || !endTime) return

						const formData = new FormData(e.currentTarget)

						formData.append('startTime', startTime.toISOString())
						formData.append('endTime', endTime.toISOString())
						fetcher.submit(formData, {
							method: 'post',
							replace: true,
						})
					}}
				>
					{error && (
						<Alert
							icon={<InformationCircleIcon className="h-4 w-4" />}
							title="Conflict!"
							color="red"
						>
							{error}
						</Alert>
					)}

					<fieldset
						disabled={isSubmitting}
						className="mt-2 flex flex-col gap-4"
					>
						<input type="hidden" name="sectionId" value={selectedSection?.id} />

						<TextInput
							name="code"
							label="Section Code"
							defaultValue={selectedSection?.code}
							error={fetcher.data?.fieldErrors?.code}
							required
						/>

						<TextInput
							name="name"
							label="Section Name"
							defaultValue={selectedSection?.name}
							error={fetcher.data?.fieldErrors?.name}
							required
						/>

						<Select
							name="courseId"
							label="Course"
							defaultValue={selectedSection?.course.id}
							error={fetcher.data?.fieldErrors?.courseId}
							data={courses.map(course => ({
								value: course.id,
								label: course.name,
							}))}
							required
						/>

						<Select
							name="facultyId"
							label="Faculty"
							value={facultyId}
							onChange={e => setFacultyId(e)}
							error={fetcher.data?.fieldErrors?.facultyId}
							data={faculties.map(faculty => ({
								value: faculty.id,
								label: faculty.name,
							}))}
							required
						/>

						<Select
							name="roomId"
							label="Room"
							value={roomId}
							onChange={e => setRoomId(e)}
							error={fetcher.data?.fieldErrors?.roomId}
							data={rooms.map(room => ({
								value: room.id,
								label: room.no,
							}))}
							required
						/>

						<Select
							name="day"
							label="Day"
							value={day}
							onChange={e => setDay(e as Day)}
							error={fetcher.data?.fieldErrors?.day}
							data={Object.values(Day).map(day => ({
								value: day,
								label: day,
							}))}
							required
						/>

						<div className="grid grid-cols-2 gap-4">
							<TimeInput
								label="Start Time"
								format="12"
								value={startTime}
								onChange={e => setStartTime(e)}
								error={fetcher.data?.fieldErrors?.startTime}
								required
							/>

							<TimeInput
								label="End Time"
								value={endTime}
								format="12"
								onChange={e => setEndTime(e)}
								error={fetcher.data?.fieldErrors?.endTime}
								required
							/>
						</div>

						<div className="mt-1 flex items-center justify-end gap-4">
							<Button
								variant="subtle"
								disabled={isSubmitting}
								onClick={() => {
									setSelectedSection(null)
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
								disabled={disableSubmit}
							>
								{mode === MODE.edit ? 'Save changes' : 'Create'}
							</Button>
						</div>
					</fieldset>
				</Form>
			</Modal>
		</>
	)
}
