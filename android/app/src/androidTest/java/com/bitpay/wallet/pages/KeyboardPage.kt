package com.bitpay.wallet.pages

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions
import androidx.test.espresso.action.ViewActions.click
import com.bitpay.wallet.utils.WaitUtils
import com.bitpay.wallet.utils.WaitUtils.withTestId
import org.hamcrest.Matchers.not
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.espresso.matcher.ViewMatchers.hasSibling
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.withContentDescription
import org.hamcrest.Matchers.allOf

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.CoordinatesProvider
import androidx.test.espresso.action.GeneralClickAction
import androidx.test.espresso.action.Press
import androidx.test.espresso.action.Tap
import androidx.test.espresso.matcher.ViewMatchers.withText
import android.view.View

class KeyboardPage {

    // ---- Locators ----

    private val continueButton = withText("Continue")


    // ---- Actions ----
//    fun enterAmount(amount: String = "0") {
//        for (char in amount) {
//            val key = allOf(
//                withText(char.toString()),
//                not(hasSibling(withText("BTC")))
//            )
//            WaitUtils.waitForView(key)
//            onView(key).perform(click())
//        }
//    }

    fun enterAmount(amount: String = "0") {
        for (char in amount) {
            val key = withText(char.toString())
            WaitUtils.waitForView(key)
            onView(key).perform(click())
            Thread.sleep(200) // give RN's JS thread time to process the state update
        }
    }

    fun clickContinue() {
        WaitUtils.waitForViewEnabled(continueButton)
        onView(continueButton).perform(click())
    }


    /**
     * Backspace key does not expose a unique accessibility identifier.
     * Calculate its position dynamically using the relative spacing
     * between the keypad keys "6" and "9".
     */
    fun clickBackspace(count: Int = 1) {

        val sixKey = withText("6")
        val nineKey = withText("9")

        WaitUtils.waitForView(sixKey)
        WaitUtils.waitForView(nineKey)

        var sixView: View? = null
        var nineView: View? = null

        onView(sixKey).perform(object : androidx.test.espresso.ViewAction {
            override fun getConstraints() = org.hamcrest.Matchers.any(View::class.java)
            override fun getDescription() = "capture six key view"
            override fun perform(uiController: androidx.test.espresso.UiController, view: View) {
                sixView = view
            }
        })

        onView(nineKey).perform(object : androidx.test.espresso.ViewAction {
            override fun getConstraints() = org.hamcrest.Matchers.any(View::class.java)
            override fun getDescription() = "capture nine key view"
            override fun perform(uiController: androidx.test.espresso.UiController, view: View) {
                nineView = view
            }
        })

        val sixLocation = IntArray(2)
        val nineLocation = IntArray(2)
        sixView!!.getLocationOnScreen(sixLocation)
        nineView!!.getLocationOnScreen(nineLocation)

        val sixMidY = sixLocation[1] + (sixView!!.height / 2)
        val nineMidY = nineLocation[1] + (nineView!!.height / 2)
        val nineMidX = nineLocation[0] + (nineView!!.width / 2)

        val rowHeight = Math.abs(nineMidY - sixMidY)

        val backspaceX = nineMidX.toFloat()
        val backspaceY = (nineMidY + rowHeight).toFloat()

        val backspaceCoordinatesProvider = CoordinatesProvider { _ ->
            floatArrayOf(backspaceX, backspaceY)
        }

        repeat(count) {
            onView(withText("9")).perform(
                GeneralClickAction(
                    Tap.SINGLE,
                    backspaceCoordinatesProvider,
                    Press.FINGER,
                    android.view.InputDevice.SOURCE_UNKNOWN,
                    android.view.MotionEvent.BUTTON_PRIMARY
                )
            )
        }
    }


}