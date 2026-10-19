package com.bitpay.wallet.utils

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.UiController
import androidx.test.espresso.ViewAction
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.isEnabled
import androidx.test.espresso.matcher.ViewMatchers.withEffectiveVisibility
import org.hamcrest.Matcher
import android.view.View
import androidx.test.espresso.matcher.BoundedMatcher
import androidx.test.espresso.matcher.ViewMatchers
import org.hamcrest.Description
import org.hamcrest.TypeSafeMatcher


object WaitUtils {

    fun waitForView(
        matcher: Matcher<View>,
        timeoutMs: Long = 30000,
        intervalMs: Long = 500
    ) {
        val endTime = System.currentTimeMillis() + timeoutMs
        var lastError: Throwable? = null

        while (System.currentTimeMillis() < endTime) {
            try {
                onView(matcher).check(matches(isDisplayed()))
                return // found it, exit
            } catch (e: Throwable) {
                // catch EVERYTHING - NoMatchingViewException, AssertionError,
                // RootViewWithoutFocusException, anything else Espresso throws
                lastError = e
                Thread.sleep(intervalMs)
            }
        }

        // timed out - throw the last real error so the failure message is useful
        throw lastError ?: RuntimeException("View not found within ${timeoutMs}ms: $matcher")
    }

    fun waitForViewEnabled(
        matcher: Matcher<View>,
        timeoutMs: Long = 120000,
        intervalMs: Long = 500
    ) {
        val endTime = System.currentTimeMillis() + timeoutMs
        var lastError: Throwable? = null

        while (System.currentTimeMillis() < endTime) {
            try {
                onView(matcher).check(matches(isDisplayed())).check(matches(isEnabled()))
                return
            } catch (e: Throwable) {
                lastError = e
                Thread.sleep(intervalMs)
            }
        }

        throw lastError ?: RuntimeException("View not enabled within ${timeoutMs}ms: $matcher")
    }

    /**
     * React Native testIDs are surfaced to native Espresso as View.getTag(),
     * NOT as an Android resource id. withResourceName()/withId() will never
     * match them - this matcher checks the tag directly instead.
     */
    fun withTestId(testId: String): BoundedMatcher<View, View> {
        return object : BoundedMatcher<View, View>(View::class.java) {
            override fun describeTo(description: Description) {
                description.appendText("with RN testID: $testId")
            }

            override fun matchesSafely(view: View): Boolean {
                return testId == view.tag
            }
        }
    }

    /**
     * Waits for a view to have effective visibility VISIBLE without requiring
     * getGlobalVisibleRect() to be non-empty. Use this when a view is in the
     * hierarchy and marked VISIBLE but is clipped (e.g. animating bottom sheets).
     */
    fun waitForViewEffectivelyVisible(
        matcher: Matcher<View>,
        timeoutMs: Long = 30000,
        intervalMs: Long = 500
    ) {
        val endTime = System.currentTimeMillis() + timeoutMs
        var lastError: Throwable? = null
        while (System.currentTimeMillis() < endTime) {
            try {
                onView(matcher).check(matches(withEffectiveVisibility(ViewMatchers.Visibility.VISIBLE)))
                return
            } catch (e: Throwable) {
                lastError = e
                Thread.sleep(intervalMs)
            }
        }
        throw lastError ?: RuntimeException("View not visible within ${timeoutMs}ms: $matcher")
    }

    /**
     * Clicks a view without the standard isDisplayed() precondition check.
     * Use for elements that are VISIBLE but whose getGlobalVisibleRect() is empty
     * (e.g. a bottom sheet button that is present but not yet in the visible rect).
     */
    val forceClick: ViewAction = object : ViewAction {
        override fun getConstraints(): Matcher<View> = isEnabled()
        override fun getDescription() = "force click ignoring visibility"
        override fun perform(uiController: UiController, view: View) {
            view.performClick()
            uiController.loopMainThreadUntilIdle()
        }
    }

    fun <T> withIndex(matcher: Matcher<T>, index: Int): Matcher<T> {
        return object : TypeSafeMatcher<T>() {
            var currentIndex = 0

            override fun describeTo(description: Description) {
                description.appendText("with index: $index ")
                matcher.describeTo(description)
            }

            override fun matchesSafely(item: T): Boolean {
                val matched = matcher.matches(item)
                if (matched && currentIndex++ == index) {
                    return true
                }
                return false
            }
        }
    }
}
