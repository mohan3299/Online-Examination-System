import {ArrowLeftIcon} from '@heroicons/react/24/solid'
import {Button, Select} from '@mantine/core'
import {TestStatus} from '@prisma/client'
import type {LoaderArgs} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {Link, useFetcher, useLoaderData, useNavigate} from '@remix-run/react'
import * as React from 'react'
import {TailwindContainer} from '~/components/TailwindContainer'
import {db} from '~/db.server'
import {requireUserId} from '~/session.server'

export const loader = async ({params, request}: LoaderArgs) => {
	const studentId = await requireUserId(request)
	const {sectionId, testId} = params

	if (!sectionId) {
		return redirect('/classes')
	}

	if (!testId) {
		return redirect(`/classes/${sectionId}`)
	}

	const test = await db.test.findUnique({
		where: {id: testId},
		include: {
			questions: true,
		},
	})

	if (!test) {
		return redirect(`/classes/${sectionId}`)
	}

	const schedule = await db.studentSchedule.findUnique({
		where: {
			studentId_sectionId: {
				studentId,
				sectionId,
			},
		},
	})

	if (!schedule) {
		return redirect(`/classes/${sectionId}`)
	}

	let testEnrollment = await db.enrollmentTest.findUnique({
		where: {
			enrollmentId_testId: {
				enrollmentId: schedule.id,
				testId,
			},
		},
	})

	if (!testEnrollment) {
		testEnrollment = await db.enrollmentTest.create({
			data: {
				attempts: 0,
				status: TestStatus.IN_PROGRESS,
				score: 0,
				testId,
				enrollmentId: schedule.id,
			},
		})
	} else {
		testEnrollment = await db.enrollmentTest.update({
			where: {
				enrollmentId_testId: {
					enrollmentId: schedule.id,
					testId,
				},
			},
			data: {
				status: TestStatus.IN_PROGRESS,
			},
		})
	}

	return json({test, testEnrollment, sectionId})
}

export default function Quiz() {
	const {test, testEnrollment, sectionId} = useLoaderData<typeof loader>()
	const fetcher = useFetcher()
	const navigate = useNavigate()

	const isSubmitting = fetcher.state !== 'idle'

	React.useEffect(() => {
		if (fetcher.state !== 'idle' && fetcher.submission === undefined) {
			return
		}

		if (fetcher.data?.success) {
			navigate(`/classes/${sectionId}`)
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
							<Button
								leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
								variant="subtle"
								size="md"
								component={Link}
								to={`/classes/${sectionId}`}
								mb={20}
								color="dark"
							>
								Back
							</Button>
							<h1 className="text-3xl font-semibold text-gray-900">
								{test.name} ({test.questions.length} question)
							</h1>
						</div>

						<div>
							<Button
								type="submit"
								loaderPosition="left"
								form="quiz-form"
								loading={isSubmitting}
							>
								<span className="ml-2">Save and Submit</span>
							</Button>
						</div>
					</div>
					<div className="mt-8 flex flex-col">
						<div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
							<fetcher.Form
								id="quiz-form"
								className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8"
								method="post"
								replace
								action="/api/submit-quiz"
							>
								<input hidden name="testId" defaultValue={test.id} />
								<input
									hidden
									name="enrollmentTestId"
									defaultValue={testEnrollment.id}
								/>
								{test.questions.map((question, idx) => (
									<div
										key={question.id}
										className="flex items-center justify-between border-t border-gray-200"
									>
										<div className="flex flex-row items-center justify-between px-4 py-4 sm:px-6">
											<div className="flex flex-col">
												<h3 className="text-lg font-medium leading-6 text-gray-900">
													{idx + 1}. {question.question}
												</h3>

												<ol className="mt-2">
													{question.options.map((option, index) => (
														<li key={index} className="flex items-center">
															{index + 1}. {option}
														</li>
													))}
												</ol>
											</div>
										</div>

										<Select
											name="answer"
											className="w-[200px]"
											clearable
											data={[
												{label: 'Option 01', value: '1'},
												{label: 'Option 02', value: '2'},
												{label: 'Option 03', value: '3'},
												{label: 'Option 04', value: '4'},
											]}
											placeholder="Select an option"
										/>
									</div>
								))}
							</fetcher.Form>
						</div>
					</div>
				</div>
			</TailwindContainer>
		</>
	)
}
