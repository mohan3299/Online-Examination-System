import {Button} from '@mantine/core'
import type {ActionArgs} from '@remix-run/node'
import {json} from '@remix-run/node'
import {useFetcher} from '@remix-run/react'
import * as React from 'react'
import {z} from 'zod'
import {TailwindContainer} from '~/components/TailwindContainer'
import {db} from '~/db.server'
import {requireUserId} from '~/session.server'
import {useStudentData} from '~/utils/hooks'
import {formatTime} from '~/utils/misc'
import {badRequest} from '~/utils/misc.server'
import type {inferErrors} from '~/utils/validation'
import {validateAction} from '~/utils/validation'

const AddScheduleSchema = z.object({
	sectionId: z.string().min(1, 'Section is required'),
})

interface ActionData {
	success: boolean
	fieldErrors?: inferErrors<typeof AddScheduleSchema>
}

export const action = async ({request}: ActionArgs) => {
	const studentId = await requireUserId(request)
	const {fields, fieldErrors} = await validateAction(request, AddScheduleSchema)

	if (fieldErrors) {
		return badRequest<ActionData>({success: false, fieldErrors})
	}

	await db.studentSchedule.create({
		data: {
			sectionId: fields.sectionId,
			studentId,
		},
	})
	return json({success: true})
}

export default function ManageSection() {
	const {allSections, schedules} = useStudentData()
	const fetcher = useFetcher<ActionData>()

	const isSubmitting = fetcher.state !== 'idle'

	React.useEffect(() => {
		if (fetcher.state !== 'idle' && fetcher.submission === undefined) {
			return
		}

		if (fetcher.data?.success) {
			// TODO: refresh the data
		} else if (fetcher.data?.fieldErrors) {
			alert('Cannot enroll in this section.')
		}
		// handleModal is not meemoized, so we don't need to add it to the dependency array
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fetcher.data?.success, fetcher.state, fetcher.submission])

	return (
		<>
			<TailwindContainer className="rounded-md bg-white">
				<div className="mt-8 px-4 py-10 sm:px-6 lg:px-8">
					<div className="sm:flex sm:flex-auto sm:items-center sm:justify-between">
						<div>
							<h1 className="text-3xl font-semibold text-gray-900">
								Join Classes
							</h1>
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
												Course
											</th>
											<th
												scope="col"
												className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
											>
												Section
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
												Faculty
											</th>
											<th
												scope="col"
												className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
											>
												Room
											</th>
											<th
												scope="col"
												className="relative py-3.5 pl-3 pr-4 sm:pr-6 md:pr-0"
											></th>
										</tr>
									</thead>

									<tbody className="divide-y divide-gray-200">
										{allSections.map(section => {
											const isAlreadyEnrolled = schedules.some(
												s => s.sectionId === section.id
											)

											return (
												<tr key={section.id}>
													<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
														{section.course.name} ({section.course.code})
													</td>

													<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
														{section.name} ({section.code})
													</td>

													<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
														<p className="font-medium">{section.day}</p>
														<span className="text-xs text-gray-500">
															{formatTime(section.startTime)} -{' '}
															{formatTime(section.endTime)}
														</span>
													</td>

													<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
														{section.faculty.name}
													</td>

													<td className="relative space-x-4 whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6 md:pr-0">
														{section.room.no}
													</td>
													<td className="relative space-x-4 whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6 md:pr-0">
														<Button
															variant="subtle"
															compact
															loading={isSubmitting}
															color="blue"
															disabled={isAlreadyEnrolled}
															onClick={() => {
																fetcher.submit(
																	{
																		sectionId: section.id,
																	},
																	{
																		method: 'post',
																		replace: true,
																	}
																)
															}}
														>
															{isAlreadyEnrolled ? 'Enrolled' : 'Enroll'}
														</Button>
													</td>
												</tr>
											)
										})}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			</TailwindContainer>
		</>
	)
}
