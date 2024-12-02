import {ArrowLeftIcon} from '@heroicons/react/24/solid'
import {Button} from '@mantine/core'
import type {ActionArgs, LoaderArgs} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {Link, useLoaderData, useRevalidator} from '@remix-run/react'
import * as React from 'react'
import {z} from 'zod'
import {TailwindContainer} from '~/components/TailwindContainer'
import {db} from '~/db.server'
import {requireUserId} from '~/session.server'
import {useStudentData} from '~/utils/hooks'
import {badRequest} from '~/utils/misc.server'
import type {inferErrors} from '~/utils/validation'
import {validateAction} from '~/utils/validation'

export const loader = async ({params, request}: LoaderArgs) => {
	const {sectionId} = params

	if (!sectionId) {
		return redirect('/classes')
	}

	const section = await db.section.findUnique({
		where: {id: sectionId},
		include: {
			tests: {
				include: {
					questions: true,
				},
			},
			course: true,
		},
	})

	if (!section) {
		return redirect('/classes')
	}

	return json({section})
}
const DropScheduleSchema = z.object({
	scheduleId: z.string().min(1, 'Schedule is required'),
})

interface ActionData {
	success: boolean
	fieldErrors?: inferErrors<typeof DropScheduleSchema>
}

export const action = async ({request}: ActionArgs) => {
	const studentId = await requireUserId(request)
	const {fields, fieldErrors} = await validateAction(
		request,
		DropScheduleSchema
	)

	if (fieldErrors) {
		return badRequest<ActionData>({success: false, fieldErrors})
	}

	await db.studentSchedule.delete({
		where: {
			id: fields.scheduleId,
			studentId,
		},
	})
	return json({success: true})
}

export default function ManageSection() {
	const {section} = useLoaderData<typeof loader>()
	const {schedules} = useStudentData()

	const revalidator = useRevalidator()

	React.useEffect(() => {
		revalidator.revalidate()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	return (
		<>
			<TailwindContainer className="rounded-md bg-white">
				<div className="mt-8 px-4 py-10 sm:px-6 lg:px-8">
					<div className="sm:flex sm:flex-auto sm:items-center sm:justify-between">
						<div>
							<Button
								leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
								variant="white"
								size="md"
								component={Link}
								to=".."
								pl={0}
								mb={20}
								color="gray"
							>
								Back
							</Button>
							<h1 className="text-3xl font-semibold text-gray-900">
								{section.name} ({section.course.name})
							</h1>
						</div>
					</div>
					<div className="mt-8 flex flex-col">
						<div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
							<div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
								{section.tests.length > 0 ? (
									<>
										<div className="overflow-hidden">
											<ul>
												{section.tests.map(test => {
													const schedule = schedules.find(schedule =>
														schedule.tests.some(t => t.testId === test.id)
													)

													const testDetails = schedule?.tests.find(
														t => t.testId === test.id
													)

													const hasAttemptedExam = Boolean(testDetails)
													const hasReachedMaxAttempts = Boolean(
														testDetails?.attempts! >= test.maxAttempts
													)

													const shouldDisable =
														hasAttemptedExam && hasReachedMaxAttempts

													return (
														<li key={test.id}>
															<>
																{hasAttemptedExam && hasReachedMaxAttempts && (
																	<p className="mb-2 text-center text-sm text-red-500">
																		You've reached your max attempts!
																	</p>
																)}

																<Button
																	component={Link}
																	to={`/classes/${section.id}/tests/${test.id}`}
																	disabled={shouldDisable}
																	fullWidth
																	h={60}
																	mb={20}
																	className="hover:bg-gray-50"
																>
																	<div className="px-4 py-4 sm:px-6">
																		<div className="flex items-center justify-between gap-6">
																			<p className="truncate text-sm font-medium">
																				{test.name} ({test.questions.length}{' '}
																				question)
																			</p>

																			<p className="truncate text-sm font-medium">
																				<span>
																					Max Attempts: {test.maxAttempts}
																				</span>

																				<span className="ml-6 truncate text-sm font-medium">
																					Your attempts:{' '}
																					{hasAttemptedExam
																						? testDetails?.attempts
																						: 'Not attempted'}
																				</span>
																			</p>

																			{hasAttemptedExam && (
																				<p className="truncate text-sm font-medium">
																					<span>
																						Score: {testDetails?.score}/
																						{test.questions.length}
																					</span>
																				</p>
																			)}
																		</div>
																	</div>
																</Button>
															</>
														</li>
													)
												})}
											</ul>
										</div>
									</>
								) : (
									<div className="flex flex-col items-center justify-center rounded border border-dashed border-gray-400 py-12">
										<div className="text-sm font-medium italic text-gray-900">
											No quizzes yet
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</TailwindContainer>
		</>
	)
}
